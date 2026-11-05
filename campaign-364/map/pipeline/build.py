import sys, os, json, re, csv, numpy as np, subprocess, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
exec(open('regions_all.py').read())
K='/home/user/ck3src/The-Kingdom-of-Heaven/'
A=json.load(open('assign.json')); X0,X1,Y0,Y1=A['crop']; creg=A['creg']; cityb=A['cityb']
pid=np.load('pid.npy')[Y0:Y1,X0:X1].astype(np.int32); H,W=pid.shape
bar={int(k):v for k,v in json.load(open('titles.json')).items()}
rows=[r for r in csv.reader(open(K+'map_data/definition.csv',encoding='utf-8-sig',errors='replace'),delimiter=';') if r and r[0].strip().isdigit()]
names={int(r[0]):r[4] for r in rows}
ids=np.unique(pid)
def kind(p):
    if p in bar: return 'l'
    n=names.get(p,'').lower()
    if n.startswith('river_'): return 'r'
    if n.startswith('sea_') or 'ocean' in n or 'atlantic' in n or n.endswith(' ti') or 'sea' in n: return 's'
    if 'lake' in n: return 'k'
    return 'w'
KIND={int(p):kind(int(p)) for p in ids}
# ---- base groups: (duchy, region) for land ----
CITYP={p:i for i,(nm,p) in enumerate(cityb.items())}
cnames=list(cityb.keys())
EXTRA={}
for nm,lst in EXTRA.items():
    for p in lst: CITYP[p]=cnames.index(nm)
grp_of={}; groups=[]
for p in ids:
    p=int(p)
    if KIND[p]!='l' or p in CITYP: continue
    v=bar[p]; r=creg.get(v['c'],-1)
    key=(v['d'],r)
    if key not in grp_of: grp_of[key]=len(groups); groups.append({'d':v['d'],'r':r,'counties':set()})
    groups[grp_of[key]]['counties'].add(v['c'])
lut=np.full(pid.max()+1,-1,np.int64)
for p in ids:
    p=int(p)
    if KIND[p]=='l' and p not in CITYP: v=bar[p]; lut[p]=grp_of[(v['d'],creg.get(v['c'],-1))]
G=lut[pid]
NG=len(groups)
area=np.bincount(G[G>=0],minlength=NG).astype(float)
# adjacency between groups
def adjacency(L,N):
    adj=[dict() for _ in range(N)]
    for a,b in ((L[:,:-1],L[:,1:]),(L[:-1,:],L[1:,:])):
        m=(a!=b)&(a>=0)&(b>=0); x=a[m].astype(np.int64); y=b[m].astype(np.int64)
        u,c=np.unique(np.minimum(x,y)*N+np.maximum(x,y),return_counts=True)
        for kk,cc in zip(u.tolist(),c.tolist()):
            p_,q_=divmod(kk,N); adj[p_][q_]=adj[p_].get(q_,0)+cc; adj[q_][p_]=adj[q_].get(p_,0)+cc
    return adj
adj=adjacency(G,NG)
# fill enclosed holes: an unassigned group mostly bordered by assigned land joins its main neighbour's region
for _ in range(4):
    changed=False
    for i,g in enumerate(groups):
        if g['r']>=0 or area[i]==0: continue
        tot=sum(adj[i].values()); asg={}
        for q,c in adj[i].items():
            rq=groups[q]['r']
            if rq>=0: asg[rq]=asg.get(rq,0)+c
        if tot and sum(asg.values())>=0.6*tot:
            g['r']=max(asg,key=asg.get); changed=True
    if not changed: break
inreg=area[[g['r']>=0 for g in groups]]
MED=float(np.median(area[[i for i,g in enumerate(groups) if g['r']>=0 and area[i]>0]]))
print('groups',NG,'median area px',int(MED),file=sys.stderr)
# merge small groups into a same-region neighbour
parent=list(range(NG))
def find(x):
    while parent[x]!=x: x=parent[x]
    return x
for p in sorted(range(NG),key=lambda i:area[i]):
    if area[p]==0 or find(p)!=p or area[p]>=0.9*MED: continue
    cands=[(c,find(q)) for q,c in adj[p].items() if find(q)!=p and groups[find(q)]['r']==groups[p]['r'] and area[find(q)]+area[p]<=2.4*MED]
    if not cands: continue
    c,q=max(cands,key=lambda t:t[0]/(1+area[t[1]]/MED))
    parent[p]=q; area[q]+=area[p]
    for r_,c_ in list(adj[p].items()):
        if find(r_)==q: continue
        adj[q][r_]=adj[q].get(r_,0)+c_; adj[r_][q]=adj[r_].get(q,0)+c_
root=np.array([find(i) for i in range(NG)])
G2=np.where(G>=0,root[np.maximum(G,0)],-1)
alive=np.unique(G2[G2>=0]); rem=np.full(NG,-1); rem[alive]=np.arange(len(alive)); P=np.where(G2>=0,rem[np.maximum(G2,0)],-1)
prov=[groups[a] for a in alive]; NP=len(prov)
# split very large provinces into parts along county borders (k parts by farthest-point seeds)
area=np.bincount(P[P>=0],minlength=NP).astype(float)
cid={}; C=np.full(pid.shape,-1,np.int32)
lutc=np.full(pid.max()+1,-1,np.int64)
for p in ids:
    p=int(p)
    if KIND[p]=='l' and p not in CITYP:
        c=bar[p]['c']; cid.setdefault(c,len(cid)); lutc[p]=cid[c]
C=lutc[pid]
newP=P.copy(); extra=[]; nxt=NP
for i in range(NP):
    if prov[i]['r']<0 or area[i]<3.5*MED: continue
    k=int(round(area[i]/(2.0*MED)))
    m=P==i; cs=np.unique(C[m]); cs=cs[cs>=0]
    if len(cs)<=k: k=len(cs)
    if k<2: continue
    ys,xs=np.indices(P.shape)
    cen={}
    for c in cs:
        mm=m&(C==c); cen[int(c)]=(ys[mm].mean(),xs[mm].mean(),mm.sum())
    pts=np.array([[cen[c][0],cen[c][1]] for c in cs]); wts=np.array([cen[c][2] for c in cs])
    seeds=[int(np.argmax(wts))]; d=((pts-pts[seeds[0]])**2).sum(1)
    for _ in range(k-1): s_=int(d.argmax()); seeds.append(s_); d=np.minimum(d,((pts-pts[s_])**2).sum(1))
    for _ in range(6):
        lab=np.argmin(((pts[:,None]-pts[seeds][None])**2).sum(-1),1)
        cent=np.array([np.average(pts[lab==j],0,wts[lab==j]) if (lab==j).any() else pts[seeds[j]] for j in range(k)])
        seeds=[int(np.argmin(((pts-cent[j])**2).sum(1))) for j in range(k)]
    lab=np.argmin(((pts[:,None]-pts[seeds][None])**2).sum(-1),1)
    for j in range(1,k):
        cj=cs[lab==j]
        if len(cj)==0: continue
        newP[m&np.isin(C,cj)]=len(prov)+len(extra); extra.append(dict(prov[i]))
P=newP; prov=prov+extra; NP=len(prov)
# enforce contiguity: a province split into pieces keeps its largest piece; others become their own provinces
out=P.copy(); pieces=[]
for i in range(NP):
    m=(P==i)
    if not m.any(): continue
    ys,xs=np.nonzero(m); y0,x0=ys.min(),xs.min(); hh,ww=ys.max()-y0+1,xs.max()-x0+1
    win=np.zeros((hh,ww),np.uint8); win[ys-y0,xs-x0]=1
    lab=np.frombuffer(subprocess.run(['./label',str(ww),str(hh)],input=win.tobytes(),capture_output=True).stdout,dtype=np.int32).reshape(hh,ww)
    l=lab[ys-y0,xs-x0]; u,cn=np.unique(l,return_counts=True)
    if len(u)<=1: continue
    big=u[cn.argmax()]
    for uu,cc in zip(u,cn):
        if uu==big: continue
        if cc<400: pieces.append((i,ys[l==uu],xs[l==uu])); continue   # small islands stay with their province
        out[ys[l==uu],xs[l==uu]]=len(prov)
        prov.append(dict(prov[i]))
P=out; NP=len(prov)
# per region: merge down to a few provinces (2..8, about one per 2.6 median duchies)
area=np.bincount(P[P>=0],minlength=NP).astype(float)
adj=adjacency(P,NP)
par=list(range(NP))
def fd(x):
    while par[x]!=x: x=par[x]
    return x
from collections import defaultdict
byreg=defaultdict(list)
for i,g in enumerate(prov):
    if area[i]>0: byreg[g['r']].append(i)
for r,lst in byreg.items():
    if r<0: continue
    tot=sum(area[i] for i in lst); target=int(max(2,min(8,round(tot/(2.6*MED)))))
    live=set(lst)
    while len(live)>target:
        p=min(live,key=lambda i:area[i])
        cands=[(c,fd(q)) for q,c in adj[p].items() if fd(q) in live and fd(q)!=p]
        if not cands: live.discard(p); continue
        c,q=max(cands,key=lambda t:t[0]/(area[t[1]]**0.5))
        par[p]=q; area[q]+=area[p]; live.discard(p)
        for r_,c_ in list(adj[p].items()):
            if fd(r_)==q: continue
            adj[q][r_]=adj[q].get(r_,0)+c_; adj[r_][q]=adj[r_].get(q,0)+c_
rt=np.array([fd(i) for i in range(NP)])
P=np.where(P>=0,rt[np.maximum(P,0)],-1)
al=np.unique(P[P>=0]); rm=np.full(NP,-1); rm[al]=np.arange(len(al)); P=np.where(P>=0,rm[np.maximum(P,0)],-1)
prov=[prov[a] for a in al]; NP=len(prov)
area=np.bincount(P[P>=0],minlength=NP)
# ---- unit raster: provinces, then city baronies ----
U=P.copy()
for nm,p in cityb.items(): U[pid==p]=NP+cnames.index(nm)
for nm,lst in EXTRA.items():
    for p in lst: U[pid==p]=NP+cnames.index(nm)
for p in ids:
    p=int(p); k_=KIND[p]
    if k_=='l': continue
    U[pid==p]={'s':-9,'k':-5,'r':-3,'w':-4}[k_]
# impassable mountains become part of the neighbouring provinces; deserts and the high Caucasus stay as wasteland
MOUNT=('mountain','alps','carpath','impass','range','mount ','atlas','taurus')
mt=[int(p) for p in ids if KIND[int(p)]=='w' and any(w in names.get(int(p),'').lower() for w in MOUNT) and 'caucasus' not in names.get(int(p),'').lower()]
mm=np.isin(pid,mt); U[mm]=-7
for _ in range(400):
    todo=U==-7
    if not todo.any(): break
    for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)):
        sh=np.roll(U,(dy,dx),axis=(0,1)); m=(U==-7)&(sh>=0)&(sh<NP); U[m]=sh[m]
U[U==-7]=-4
print('mountain px absorbed',int(mm.sum()),file=sys.stderr)
# Rome: grow its own barony shape evenly outward (an offset of its outline) to about 3x area
def offset_grow(u, factor, keep_from):
    m=(U==u); a0=int(m.sum()); target=int(a0*(factor-1))
    allowed=(U>=0)&(U<NP)
    for v in keep_from:                       # stay 4 px clear of these cities
        o=(U==v); b_=o.copy()
        for dy in range(-4,5):
            for dx in range(-4,5):
                if dy*dy+dx*dx<=16: b_|=np.roll(o,(dy,dx),axis=(0,1))
        allowed&=~b_
    lab=np.where(allowed|m,0,-1).astype(np.int32)
    edge=m&~(np.roll(m,1,0)&np.roll(m,-1,0)&np.roll(m,1,1)&np.roll(m,-1,1))
    si,sj=np.nonzero(edge)
    lab.tofile('_cm.bin'); np.ones(U.shape,np.float32).tofile('_cost.bin')
    with open('_src.bin','wb') as fh:
        fh.write(struct.pack('i',len(si)))
        for i,j in zip(si.tolist(),sj.tolist()): fh.write(struct.pack('iif',i*W+j,0,1e9))
    subprocess.run(['./grow2',str(W),str(H),'0','0.000001','_cm.bin','_cost.bin','_src.bin','_own.bin','_dist.bin'],check=True)
    dist=np.fromfile('_dist.bin',dtype=np.float32).reshape(U.shape)
    for s_ in ('cm','cost','src','own','dist'): os.remove(f'_{s_}.bin')
    cand=allowed&~m&(dist<1e29)
    d=np.sort(dist[cand]); thr=d[min(target,len(d)-1)]
    U[cand&(dist<=thr)]=u
    print('grown',cnames[u-NP],a0,'->',int((U==u).sum()),'offset px',round(float(thr),1),file=sys.stderr)
# ---- city sizes by importance in 365 (area in CK3 px) ----
TIER={1:1000,2:620,3:340,4:170}
T1={'Roma','Nova Roma'}
T2={'Mediolanum','Augusta Treverorum','Carthago','Aquileia','Sirmium','Thessalonica','Lugdunum','Arelate'}
T3={'Londinium','Eboracum','Colonia Agrippina','Mogontiacum','Burdigala','Narbo Martius','Vienna','Tarraco','Corduba','Hispalis','Emerita Augusta',
 'Carthago Nova','Caesaraugusta','Olisipo','Iol Caesarea','Cirta','Hippo Regius','Hadrumetum','Leptis Magna','Ravenna','Verona','Patavium','Neapolis',
 'Syracusae','Panormus','Salona','Serdica','Naissus','Viminacium','Marcianopolis','Philippopolis','Hadrianopolis','Athenae','Corinthus','Dyrrachium',
 'Durocortorum','Augusta Vindelicum','Argentoratum','Ticinum','Brundisium','Caralis','Aquincum'}
def tier(n): return 1 if n in T1 else 2 if n in T2 else 3 if n in T3 else 4
def dist_from(lab_ok, seeds_mask):
    lab=np.where(lab_ok,0,-1).astype(np.int32); si,sj=np.nonzero(seeds_mask)
    lab.tofile('_cm.bin'); np.ones(U.shape,np.float32).tofile('_cost.bin')
    with open('_src.bin','wb') as fh:
        fh.write(struct.pack('i',len(si)))
        for i,j in zip(si.tolist(),sj.tolist()): fh.write(struct.pack('iif',i*W+j,0,1e9))
    subprocess.run(['./grow2',str(W),str(H),'0','0.000001','_cm.bin','_cost.bin','_src.bin','_own.bin','_dist.bin'],check=True)
    d=np.fromfile('_dist.bin',dtype=np.float32).reshape(U.shape)
    for s_ in ('cm','cost','src','own','dist'): os.remove(f'_{s_}.bin')
    return d
def nb4(m): return np.roll(m,1,0)|np.roll(m,-1,0)|np.roll(m,1,1)|np.roll(m,-1,1)
WATER=(U==-9)|(U==-5)|(U==-3)
def shrink(u,target):
    m=(U==u); 
    if m.sum()<=target: return
    landedge=m&nb4((~m)&~WATER)             # edges toward land only: the coast stays
    if not landedge.any(): landedge=m&nb4(~m)
    d=dist_from(m,landedge); v=np.sort(d[m])[::-1]; thr=v[min(target,len(v)-1)]
    keep=m&(d>=thr); U[m&~keep]=-8
def grow_to(u,target,buffer_ids):
    m=(U==u); need=target-int(m.sum())
    if need<=0: return
    allowed=(U>=0)&(U<NP)
    for v in buffer_ids:
        o=(U==v)
        if not o.any(): continue
        ys,xs=np.nonzero(o); y0,y1,x0,x1=max(0,ys.min()-5),ys.max()+6,max(0,xs.min()-5),xs.max()+6
        sub=o[y0:y1,x0:x1]; b_=sub.copy()
        for dy in range(-4,5):
            for dx in range(-4,5):
                if dy*dy+dx*dx<=16: b_|=np.roll(sub,(dy,dx),axis=(0,1))
        allowed[y0:y1,x0:x1]&=~b_
    edge=m&nb4(~m); d=dist_from(allowed|m,edge)
    cand=allowed&~m&(d<1e29); v=np.sort(d[cand])
    if len(v)==0: return
    thr=v[min(need,len(v)-1)]; U[cand&(d<=thr)]=u
cids=[NP+i for i in range(len(cnames))]
before={cnames[u-NP]:int((U==u).sum()) for u in cids}
for u in cids: shrink(u,TIER[tier(cnames[u-NP])])
# freed pixels go back to the surrounding province
for _ in range(60):
    t=U==-8
    if not t.any(): break
    for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)):
        sh=np.roll(U,(dy,dx),axis=(0,1)); mm=(U==-8)&(sh>=0)&(sh<NP); U[mm]=sh[mm]
U[U==-8]=-4
for u in sorted(cids,key=lambda u:-TIER[tier(cnames[u-NP])]):
    grow_to(u,TIER[tier(cnames[u-NP])],[v for v in cids if v!=u])
# one solid piece per city, and a gap between neighbouring cities
def components(mask):
    ys,xs=np.nonzero(mask); y0,x0=ys.min(),xs.min(); hh,ww=ys.max()-y0+1,xs.max()-x0+1
    win=np.zeros((hh,ww),np.uint8); win[ys-y0,xs-x0]=1
    lab=np.frombuffer(subprocess.run(['./label',str(ww),str(hh)],input=win.tobytes(),capture_output=True).stdout,dtype=np.int32).reshape(hh,ww)
    return ys,xs,lab[ys-y0,xs-x0]
size_={u:TIER[tier(cnames[u-NP])] for u in cids}
for u in cids:
    m=U==u
    if not m.any(): continue
    ys,xs,l=components(m); vals,cn=np.unique(l,return_counts=True); big=vals[cn.argmax()]
    U[ys[l!=big],xs[l!=big]]=-8
iscity=(U>=NP)
for dy in range(-2,3):
    for dx in range(-2,3):
        if dy*dy+dx*dx>4: continue
        sh=np.roll(U,(dy,dx),axis=(0,1))
        clash=iscity&(sh>=NP)&(sh!=U)
        if clash.any():
            a_=np.array([size_.get(int(v),0) for v in U[clash]]); b_=np.array([size_.get(int(v),0) for v in sh[clash]])
            ys,xs=np.nonzero(clash); lose=(a_>b_)|((a_==b_)&(U[clash]>sh[clash]))
            U[ys[lose],xs[lose]]=-8; iscity=(U>=NP)
for _ in range(60):
    t=U==-8
    if not t.any(): break
    for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)):
        sh=np.roll(U,(dy,dx),axis=(0,1)); mm=(U==-8)&(sh>=0)&(sh<NP); U[mm]=sh[mm]
U[U==-8]=-4
for u in cids:      # the gap may have split a city: keep its largest piece again
    m=U==u
    if not m.any(): continue
    ys,xs,l=components(m); vals,cn=np.unique(l,return_counts=True); big=vals[cn.argmax()]
    for y,x in zip(ys[l!=big],xs[l!=big]):
        for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)):
            v=U[y+dy,x+dx]
            if 0<=v<NP: U[y,x]=v; break
        else: U[y,x]=-4
after={cnames[u-NP]:int((U==u).sum()) for u in cids}
for t in (1,2,3,4):
    xs=[after[n] for n in cnames if tier(n)==t]; print('tier',t,'cities',len(xs),'area px min/median/max',min(xs),int(np.median(xs)),max(xs),file=sys.stderr)
np.save('U.npy',U)
np.save('U.npy',U)
prov_reg=[g['r'] for g in prov]
city_reg=[creg[bar[cityb[n]]['c']] for n in cnames]
def pretty(t): return ' '.join(w.capitalize() for w in t[2:].split('_'))
json.dump({'NP':NP,'prov':[{'r':g['r'],'d':pretty(g['d']),'A':int(area[i])} for i,g in enumerate(prov)],
           'cities':[{'n':n,'r':city_reg[i],'b':pretty(bar[cityb[n]]['b']),'c':pretty(bar[cityb[n]]['c'])} for i,n in enumerate(cnames)],
           'crop':[X0,X1,Y0,Y1]},open('build.json','w'),ensure_ascii=False)
inr=[a for a,g in zip(area,prov) if g['r']>=0]
from collections import Counter
cntr=Counter(g['r'] for g in prov if g['r']>=0)
print('provinces',NP,'in regions',len(inr),'| per region: min',min(cntr.values()),'max',max(cntr.values()),'| Lugdunensis',cntr[[i for i,R in enumerate(REGALL) if R[0]=='Gallia Lugdunensis'][0]],file=sys.stderr)
# preview
rng=np.random.default_rng(3); pal=rng.integers(120,230,(NP+200,3)).astype(np.uint8)
rgb=np.zeros((H,W,3),np.uint8); rgb[:]=(173,224,241)
m=U>=0; rgb[m]=pal[np.minimum(U[m],NP+199)]; rgb[U==-4]=(200,200,200); rgb[U==-3]=(88,168,200); rgb[U==-5]=(173,224,241)
rgb[U>=NP]=(120,30,30)
bd=((U!=np.roll(U,1,0))|(U!=np.roll(U,1,1)))&(U!=-9); rgb[bd]=(70,70,70)
from PIL import Image
Image.fromarray(rgb).resize((W//2,H//2)).save('build.png')
Image.fromarray(rgb[1000:1500,600:1300]).save('build_gaul.png')
