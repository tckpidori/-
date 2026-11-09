import sys, os, json, re, csv, numpy as np, subprocess, struct, math
os.chdir(os.path.dirname(os.path.abspath(__file__)))
exec(open('regions_all.py').read()); exec(open('model.py').read())
CK='../ck3/'; KD='/home/user/ck3src/The-Kingdom-of-Heaven/'
A=json.load(open(CK+'assign.json')); X0,X1,Y0,Y1=A['crop']; creg=A['creg']; cityb=A['cityb']
pid=np.load(CK+'pid.npy')[Y0:Y1,X0:X1].astype(np.int32); H,W=pid.shape
bar={int(k):v for k,v in json.load(open(CK+'titles.json')).items()}
rows=[r for r in csv.reader(open(KD+'map_data/definition.csv',encoding='utf-8-sig',errors='replace'),delimiter=';') if r and r[0].strip().isdigit()]
names={int(r[0]):r[4] for r in rows}
ids=[int(p) for p in np.unique(pid)]
def kind(p):
    if p in bar: return 'l'
    n=names.get(p,'').lower()
    if n.startswith('river_'): return 'r'
    if n.startswith('sea_') or 'ocean' in n or 'atlantic' in n or n.endswith(' ti') or 'sea' in n: return 's'
    if 'lake' in n: return 'k'
    return 'w'
KIND={p:kind(p) for p in ids}
G=np.load(CK+'geo.npy',allow_pickle=True); fsrc,fw=G[0],G[1]
def U_(r2): return np.where(r2>0,r2*np.log(r2+1e-12),0.0)
def fwd(la,lo):
    X=np.stack([(np.asarray(lo,float)-15)/30,(np.asarray(la,float)-45)/15],1); n=len(fsrc)
    Kx=U_(((X[:,None]-fsrc[None])**2).sum(-1)); Q=np.hstack([np.ones((len(X),1)),X])
    o=np.stack([Kx@fw[j][:n]+Q@fw[j][n:] for j in range(2)],1); o[:,0]-=X0; o[:,1]-=Y0; return o
def log(*a): print(*a,file=sys.stderr)
# ---------- counties ----------
cix={}; lut=np.full(max(ids)+1,-1,np.int32); kl=np.zeros(max(ids)+1,np.int8)
for p in ids:
    if KIND[p]=='l': lut[p]=cix.setdefault(bar[p]['c'],len(cix))
    kl[p]={'l':0,'s':1,'k':2,'r':3,'w':4}[KIND[p]]
cname=list(cix); NC=len(cname)
CN=lut[pid]; KL=kl[pid]
MOUNT=('mountain','alps','carpath','impass','range','mount ','atlas','taurus')
mt=[p for p in ids if KIND[p]=='w' and any(w in names.get(p,'').lower() for w in MOUNT) and 'caucasus' not in names.get(p,'').lower()]
_cnt=dict(zip(*[a.tolist() for a in np.unique(pid,return_counts=True)]))
small=[p for p in ids if KIND[p]=='w' and p not in mt and (_cnt[p]<5000 or (_cnt[p]<9000 and 'desert' not in names.get(p,'').lower() and 'wast' not in names.get(p,'').lower()))]
log('small impassables absorbed:',[(names.get(p,''),_cnt[p]) for p in small])
log('kept as wasteland:',sorted([(names.get(p,''),_cnt[p]) for p in ids if KIND[p]=='w' and p not in mt and p not in small],key=lambda t:-t[1])[:40])
mt=mt+small
MT=np.isin(pid,mt)
def flood(L,mask,iters=500):
    L=L.copy(); todo=mask&(L<0)
    for _ in range(iters):
        if not todo.any(): break
        ch=False
        for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)):
            sh=np.roll(L,(dy,dx),axis=(0,1)); m=todo&(sh>=0)
            if m.any(): L[m]=sh[m]; todo&=~m; ch=True
        if not ch: break
    return L
CN=flood(CN,MT)                      # impassable mountains join the neighbouring counties
CNa=flood(CN,KL==3,12)               # for adjacency only: counties meet across rivers
ys,xs=np.indices(CN.shape); m=CN>=0
carea=np.bincount(CN[m],minlength=NC).astype(float)
ccy=np.bincount(CN[m],weights=ys[m],minlength=NC)/np.maximum(carea,1); ccx=np.bincount(CN[m],weights=xs[m],minlength=NC)/np.maximum(carea,1)
adj=[dict() for _ in range(NC)]
for a,b in ((CNa[:,:-1],CNa[:,1:]),(CNa[:-1,:],CNa[1:,:])):
    mm=(a!=b)&(a>=0)&(b>=0); x=a[mm].astype(np.int64); y=b[mm].astype(np.int64)
    u,c=np.unique(np.minimum(x,y)*NC+np.maximum(x,y),return_counts=True)
    for kk,cc in zip(u.tolist(),c.tolist()):
        p_,q_=divmod(kk,NC); adj[p_][q_]=adj[p_].get(q_,0)+cc; adj[q_][p_]=adj[q_].get(p_,0)+cc
cr=np.array([creg.get(c,-1) for c in cname])
# holes: unassigned counties mostly surrounded by assigned ones
for _ in range(5):
    ch=False
    for c in range(NC):
        if cr[c]>=0 or carea[c]==0: continue
        tot=sum(adj[c].values()); v={}
        for q,w in adj[c].items():
            if cr[q]>=0: v[cr[q]]=v.get(cr[q],0)+w
        if tot and sum(v.values())>=0.6*tot: cr[c]=max(v,key=v.get); ch=True
    if not ch: break
# pockets: a cluster of unassigned counties enclosed by assigned land is absorbed, county by county
un=set(np.nonzero((cr<0)&(carea>0))[0].tolist()); pockets=0
while un:
    s0=un.pop(); comp=[s0]; st=[s0]
    while st:
        x=st.pop()
        for q in adj[x]:
            if q in un: un.discard(q); comp.append(q); st.append(q)
    area=sum(carea[x] for x in comp); cs=set(comp)
    ext=sum(w for x in comp for q,w in adj[x].items() if q not in cs)
    # touching the map frame or open "outside" land means it is not a pocket
    ys_=[ccy[x] for x in comp]; xs_=[ccx[x] for x in comp]
    if area>30000 or ext==0 or min(ys_)<40 or min(xs_)<40 or max(ys_)>H-40 or max(xs_)>W-40: continue
    todo=set(comp); pockets+=1
    while todo:
        best=None
        for x in todo:
            v={}
            for q,w in adj[x].items():
                if cr[q]>=0: v[cr[q]]=v.get(cr[q],0)+w
            if v:
                k=max(v,key=v.get)
                if best is None or v[k]>best[0]: best=(v[k],x,k)
        if best is None: break
        cr[best[1]]=best[2]; todo.discard(best[1])
log('pockets absorbed',pockets)
# ---------- provinces ----------
RNAME=[R_[0] for R_ in REGALL]
citycounty={nm:cix[bar[p]['c']] for nm,p in cityb.items()}
PROV=[]; pv=np.full(NC,-1)
for r,R_ in enumerate(REGALL):
    cs=np.nonzero(cr==r)[0]
    if len(cs)==0: log('EMPTY list item',R_[0]); continue
    subs=SUB.get(R_[0])
    if not subs:
        PROV.append({'n':DISPLAY.get(R_[0],R_[0]),'r':r}); pv[cs]=len(PROV)-1; continue
    apts=[]; aown=[]
    for k,(nm,anc) in enumerate(subs):
        for a in anc:
            if isinstance(a,str): c=citycounty[a[1:]]; apts.append((ccx[c],ccy[c]))
            else: q=fwd([a[0]],[a[1]])[0]; apts.append((q[0],q[1]))
            aown.append(k)
    apts=np.array(apts); aown=np.array(aown); base=len(PROV)
    for nm,_ in subs: PROV.append({'n':nm,'r':r})
    d=((ccx[cs][:,None]-apts[None,:,0])**2+(ccy[cs][:,None]-apts[None,:,1])**2)
    pv[cs]=base+aown[d.argmin(1)]
    for k,(nm,anc) in enumerate(subs):          # a city's county always stays in its named province
        for a in anc:
            if isinstance(a,str) and cr[citycounty[a[1:]]]==r: pv[citycounty[a[1:]]]=base+k
NPV=len(PROV)
def comps_of(p):
    cs=set(np.nonzero(pv==p)[0].tolist()); out=[]
    while cs:
        s=cs.pop(); comp=[s]; st=[s]
        while st:
            x=st.pop()
            for q in adj[x]:
                if q in cs: cs.discard(q); comp.append(q); st.append(q)
        out.append(comp)
    return out
locked=set(citycounty.values())
for rnd in range(4):
    moved=0
    for p in range(NPV):
        cc=comps_of(p)
        if len(cc)<=1: continue
        cc.sort(key=lambda c:-sum(carea[x] for x in c))
        for comp in cc[1:]:
            if any(x in locked for x in comp): continue
            v={}
            for x in comp:
                for q,w in adj[x].items():
                    if pv[q]>=0 and pv[q]!=p and PROV[pv[q]]['r']==PROV[p]['r']: v[pv[q]]=v.get(pv[q],0)+w
            if v:
                t=max(v,key=v.get)
                for x in comp: pv[x]=t
                moved+=1
    if not moved: break
# tiny sub-provinces merge into a sibling
parea=np.bincount(pv[pv>=0],weights=carea[pv>=0],minlength=NPV)
for p in np.argsort(parea):
    if parea[p]==0 or parea[p]>=2200: continue
    v={}
    for x in np.nonzero(pv==p)[0]:
        for q,w in adj[x].items():
            if pv[q]>=0 and pv[q]!=p and PROV[pv[q]]['r']==PROV[p]['r']: v[pv[q]]=v.get(pv[q],0)+w
    if v:
        t=max(v,key=v.get); log('merge small',PROV[p]['n'],'->',PROV[t]['n']); parea[t]+=parea[p]; parea[p]=0; pv[pv==p]=t
alive=[p for p in range(NPV) if (pv==p).any()]; rm=np.full(NPV,-1); rm[alive]=np.arange(len(alive))
pv=np.where(pv>=0,rm[np.maximum(pv,0)],-1); PROV=[PROV[p] for p in alive]; NPV=len(PROV)
log('provinces',NPV)
# ---------- rasters at K ----------
K=2
PRn=np.where(CN>=0,pv[np.maximum(CN,0)],-1)
PRn=np.where(CN>=0,np.where(PRn>=0,PRn,-4),np.where(KL==1,-9,np.where(KL==2,-5,np.where(KL==3,-3,-4)))).astype(np.int32)
PR2=np.repeat(np.repeat(PRn,K,0),K,1); H2,W2=PR2.shape
CITY=np.full((H2,W2),-1,np.int16)
cnames=list(cityb)
def dil(m,r):
    o=m.copy()
    for dy in range(-r,r+1):
        for dx in range(-r,r+1):
            if (dy or dx) and dy*dy+dx*dx<=r*r+1:
                sh=np.zeros_like(m); 
                ys0,ys1=max(0,dy),m.shape[0]+min(0,dy); xs0,xs1=max(0,dx),m.shape[1]+min(0,dx)
                sh[ys0:ys1,xs0:xs1]=m[ys0-dy:ys1-dy,xs0-dx:xs1-dx]; o|=sh
    return o
def label_win(m):
    hh,ww=m.shape
    return np.frombuffer(subprocess.run(['./label',str(ww),str(hh)],input=m.astype(np.uint8).tobytes(),capture_output=True).stdout,dtype=np.int32).reshape(hh,ww)
FACE={'Athenae':(1,-1),'Nova Roma':(0.4,1),'Carthago':(0,1),'Syracusae':(0,1),'Neapolis':(1,-0.6),'Thessalonica':(1,0),'Dyrrachium':(0,-1),
 'Tingis':(-1,0),'Aquileia':(1,0),'Ravenna':(0,1),'Brundisium':(0,1),'Hadrumetum':(0,1),'Leptis Magna':(-1,0),'Salona':(1,-1),'Tarraco':(1,1),
 'Carthago Nova':(1,0),'Malaca':(1,0),'Olisipo':(1,-0.3),'Bononia':(0,-1),'Dubris':(0.5,1),'Patrae':(-1,-1),'Corinthus':(-1,0),'Panormus':(-1,0),
 'Caralis':(1,0),'Aleria':(0,1),'Hippo Regius':(-1,0),'Iol Caesarea':(-1,0),'Narbo Martius':(1,1),'Ostia':(1,-1),'Nicopolis':(0.5,-1),'Rhegium':(0,-1),
 'Ancona':(0,1),'Pisae':(0,-1),'Valentia':(0,1),'Palma':(1,-0.5)}
SEA_PULL={'Roma'}       # grows toward the sea: scaled about its point farthest from the coast
report=[]
order=sorted(range(len(cnames)),key=lambda i:(-tier(cnames[i]),cnames[i]))
for ci in order:
    nm=cnames[ci]; p=cityb[nm]; target=TIER_AREA[tier(nm)]
    by,bx=np.nonzero(pid==p); a0=len(by)
    prov=int(pv[cix[bar[p]['c']]])
    M=45; y0,y1,x0,x1=max(0,by.min()-M),min(H,by.max()+M+1),max(0,bx.min()-M),min(W,bx.max()+M+1)
    B=(pid[y0:y1,x0:x1]==p); KLw=KL[y0:y1,x0:x1]
    nb=lambda m:(np.roll(m,1,0)|np.roll(m,-1,0)|np.roll(m,1,1)|np.roll(m,-1,1))
    inner=np.argwhere(B); outer=np.argwhere(nb(B)&~B)
    dd=np.sqrt(((inner[:,None,:]-outer[None,:,:])**2).sum(-1)).min(1); pole=inner[dd.argmax()]
    sea=B&nb(KLw==1); wat=B&nb((KLw==2)|(KLw==3))
    cands=[]                                   # (anchor, onwater) in order of preference
    if nm in SEA_PULL:
        sp=np.argwhere(KLw==1); d2=((inner[:,None,:]-sp[None,::3,:])**2).sum(-1).min(1); cands.append((inner[d2.argmax()]+0.5,True))
    if sea.any():
        c=np.argwhere(sea)
        dens=np.array([B[max(0,y-4):y+5,max(0,x-4):x+5].sum() for y,x in c])    # skip spits and islets
        if (dens>=28).any(): c=c[dens>=28]
        if nm in FACE:                      # which coast the real city faces (dy,dx; y grows south)
            d=np.array(FACE[nm],float); d/=np.hypot(*d); ref=inner.mean(0)+d*math.sqrt(a0/math.pi)*1.3
            cands.append((c[((c-ref)**2).sum(1).argmin()]+0.5,True))
        cands.append((c[((c-pole)**2).sum(1).argmin()]+0.5,True))
    elif wat.any():
        c=np.argwhere(wat); cands.append((c[((c-pole)**2).sum(1).argmin()]+0.5,True))
    cands.append((pole+0.5,False))
    Bf=np.pad(B.astype(np.float32),2)
    wy0,wy1,wx0,wx1=y0*K,y1*K,x0*K,x1*K
    gy,gx=np.mgrid[wy0:wy1,wx0:wx1]; Yn=(gy+.5)/K; Xn=(gx+.5)/K
    provw=(PR2[wy0:wy1,wx0:wx1]==prov)
    oth=(CITY[wy0:wy1,wx0:wx1]>=0); free=provw&~oth
    watw=np.isin(PR2[wy0:wy1,wx0:wx1],(-9,-5,-3))
    B2=np.repeat(np.repeat(B,K,0),K,1)
    final=None
    for anc,onwater in cands:
        ay,ax=anc[0]+y0,anc[1]+x0                      # native continuous coords
        s=math.sqrt(target/a0); best=None
        for it in range(10):
            sy=ay+(Yn-ay)/s-0.5-y0+2; sx=ax+(Xn-ax)/s-0.5-x0+2
            i0=np.floor(sy).astype(int); j0=np.floor(sx).astype(int); fy=sy-i0; fx=sx-j0
            ok=(i0>=0)&(j0>=0)&(i0<Bf.shape[0]-1)&(j0<Bf.shape[1]-1); i0=np.clip(i0,0,Bf.shape[0]-2); j0=np.clip(j0,0,Bf.shape[1]-2)
            v=Bf[i0,j0]*(1-fy)*(1-fx)+Bf[i0,j0+1]*(1-fy)*fx+Bf[i0+1,j0]*fy*(1-fx)+Bf[i0+1,j0+1]*fy*fx
            S=(v>0.5)&ok&free
            if s<=1.0: S&=B2
            if onwater:
                lim=free&(B2 if s<=1.0 else True)
                for _ in range(2): S|=dil(S,2)&dil(watw,3)&lim
            if not S.any(): s*=1.25; continue
            lab=label_win(S); cy_,cx_=int((ay-y0)*K),int((ax-x0)*K)
            cand=np.argwhere(lab>=0); l0=lab[tuple(cand[((cand-(cy_,cx_))**2).sum(1).argmin()])]
            S=lab==l0; area=S.sum()/K/K
            if best is None or abs(area-target)<abs(best[1]-target): best=(S.copy(),area,s,onwater)
            if abs(area-target)<0.06*target: break
            s*=min(1.35,max(0.75,math.sqrt(target/max(area,1))))
        if best is not None and (final is None or abs(best[1]-target)<abs(final[1]-target)): final=best
        if final is not None and abs(final[1]-target)<0.2*target: break
    S,area,s,onwater=final
    hl=label_win(~S); edge=set(np.unique(np.concatenate([hl[0],hl[-1],hl[:,0],hl[:,-1]])).tolist())
    for h in np.unique(hl[hl>=0]):                 # land pockets enclosed by the city join it
        if h in edge: continue
        hm=hl==h
        if free[hm].all(): S|=hm
    CITY[wy0:wy1,wx0:wx1][S]=ci
    report.append((nm,tier(nm),a0,int(area),round(s,2),bool(onwater)))
for t in (1,2,3,4):
    xs_=[r_[3] for r_ in report if r_[1]==t]; log('tier',t,len(xs_),'area min/med/max',min(xs_),int(np.median(xs_)),max(xs_))
log('off-target:',[(r_[0],r_[3]) for r_ in report if abs(r_[3]-TIER_AREA[r_[1]])>0.2*TIER_AREA[r_[1]]])
U2=PR2.copy(); mc=CITY>=0; U2[mc]=NPV+CITY[mc]
np.save('U2.npy',U2)
RKEYS=list(REGIONS)
json.dump({'K':K,'NPV':NPV,'crop':[X0,X1,Y0,Y1],
  'prov':[{'n':P['n'],'item':RNAME[P['r']],'reg':RKEYS.index(REGION_OF[RNAME[P['r']]])} for P in PROV],
  'cities':[{'n':nm,'pv':int(pv[cix[bar[cityb[nm]]['c']]]),'t':tier(nm),'port':bool([r_ for r_ in report if r_[0]==nm][0][5])} for nm in cnames]},
  open('build2.json','w'),ensure_ascii=False)
# preview
from PIL import Image
rng=np.random.default_rng(3); pal=rng.integers(150,235,(NPV,3)).astype(np.uint8)
rgb=np.zeros((H2,W2,3),np.uint8); rgb[:]=(174,224,242); rgb[U2==-4]=(232,232,228)
m=(U2>=0)&(U2<NPV); rgb[m]=pal[U2[m]]; rgb[U2>=NPV]=(110,25,25)
bd=((U2!=np.roll(U2,1,0))|(U2!=np.roll(U2,1,1)))&(U2>=0); rgb[bd]=(60,60,60)
regof=np.array([p_['reg'] for p_ in json.load(open('build2.json'))['prov']])
RG=np.where((U2>=0)&(U2<NPV),regof[np.clip(U2,0,NPV-1)],-1)
rb=((RG!=np.roll(RG,1,0))|(RG!=np.roll(RG,1,1)))&(RG>=0)&(np.roll(RG,1,0)>=0)&(np.roll(RG,1,1)>=0); rgb[dil(rb,1)]=(0,0,0)
Image.fromarray(rgb).resize((W2//4,H2//4),Image.LANCZOS).save('b_all.png')
def crop(nm,r,out):
    i=cnames.index(nm); ys_,xs_=np.nonzero(CITY==i); cy,cx=int(ys_.mean()),int(xs_.mean())
    Image.fromarray(rgb[max(0,cy-r):cy+r,max(0,cx-r):cx+r]).resize((720,720),Image.NEAREST).save(out)
crop('Roma',150,'b_roma.png'); crop('Nova Roma',150,'b_cpl.png'); crop('Lugdunum',260,'b_lug.png'); crop('Athenae',220,'b_ath.png')
