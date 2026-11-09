import sys, os, json, numpy as np, subprocess, struct
os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0,'.')
from vec import vectorize
exec(open('regions_all.py').read()); exec(open('model.py').read())
B=json.load(open('build2.json')); K=B['K']; NPV=B['NPV']; NSP=B['NSP']; X0,X1,Y0,Y1=B['crop']
U2=np.load('U2.npy'); H2,W2=U2.shape
RKEYS=list(REGIONS); NCI=len(B['cities'])
upv=np.array([g['pv'] for g in B['sp']]+[c['pv'] for c in B['cities']])
ureg=np.array([B['prov'][p]['reg'] for p in upv])
INDEP=['#d9d6cc','#d3d9cf','#dcd3cf','#cfd6da','#d9d2dc','#d6d9c8','#d2d2d2','#dbd6c6','#cdd8d2','#d8cfd3','#d4d8dc','#dad9cf','#cfd3c9']
realms={k:{'n':v[0],'c':v[1]} for k,v in REALMS.items()}; realm_of=[]
for i,k in enumerate(RKEYS):
    ru,rm,pl=REGIONS[k]
    if rm is None: rm='I_'+k; realms[rm]={'n':ru,'c':INDEP[len([x for x in realms if x.startswith('I_')])%len(INDEP)],'ind':1}
    realm_of.append(rm)
def deepest(lab):
    Hh,Ww=lab.shape
    b=(lab!=np.roll(lab,1,0))|(lab!=np.roll(lab,-1,0))|(lab!=np.roll(lab,1,1))|(lab!=np.roll(lab,-1,1))
    lab.astype(np.int32).tofile('_cm.bin'); np.ones(lab.shape,np.float32).tofile('_cost.bin')
    si,sj=np.nonzero(b&(lab>=0))
    with open('_src.bin','wb') as fh:
        fh.write(struct.pack('i',len(si)))
        for i,j in zip(si.tolist(),sj.tolist()): fh.write(struct.pack('iif',i*Ww+j,0,1e9))
    subprocess.run(['./grow2',str(Ww),str(Hh),'0','0.000001','_cm.bin','_cost.bin','_src.bin','_own.bin','_dist.bin'],check=True)
    dist=np.fromfile('_dist.bin',dtype=np.float32).reshape(lab.shape)
    for s in ('cm','cost','src','own','dist'): os.remove(f'_{s}.bin')
    m=lab>=0; L=lab[m]; D=dist[m]; idx=np.nonzero(m)
    order=np.lexsort((-D,L)); Ls=L[order]; first=np.r_[True,Ls[1:]!=Ls[:-1]]
    return {int(L[o]):[int(idx[1][o])*K,int(idx[0][o])*K,round(float(D[o])*K,1)] for o in order[first]}
Un=U2[::K,::K]
ua=deepest(Un)
RL=np.where(Un>=0,ureg[np.maximum(Un,0)],-1); ra=deepest(RL)
PL=np.where(Un>=0,upv[np.maximum(Un,0)],-1); pa=deepest(PL); parea=np.bincount(PL[PL>=0],minlength=NPV)*K*K
rk=list(realms); rix={k:i for i,k in enumerate(rk)}
RE=np.where(RL>=0,np.array([rix[r] for r in realm_of])[np.maximum(RL,0)],-1); rea=deepest(RE)
uarea=np.bincount(U2[U2>=0],minlength=NSP+NCI); rarea=np.bincount(RL[RL>=0],minlength=len(RKEYS))*K*K; earea=np.bincount(RE[RE>=0],minlength=len(rk))*K*K
enc,meta,rings=vectorize(U2,1.3)
G=np.load('../ck3/geo.npy',allow_pickle=True); fsrc,fw=G[0],G[1]
def U_(r2): return np.where(r2>0,r2*np.log(r2+1e-12),0.0)
def fwd(la,lo):
    X=np.stack([(np.asarray(lo,float)-15)/30,(np.asarray(la,float)-45)/15],1); n=len(fsrc)
    Kx=U_(((X[:,None]-fsrc[None])**2).sum(-1)); Q=np.hstack([np.ones((len(X),1)),X])
    o=np.stack([Kx@fw[j][:n]+Q@fw[j][n:] for j in range(2)],1); o[:,0]=(o[:,0]-X0)*K; o[:,1]=(o[:,1]-Y0)*K; return o
cidx={c['n']:i for i,c in enumerate(B['cities'])}
pl=[]
for n_,nm,t,col in PLAYERS:
    w=START[n_]
    if isinstance(w,str): a=ua[NSP+cidx[w]]; x,y=a[0],a[1]
    else:
        q=fwd([w[0]],[w[1]])[0]; x,y=float(q[0]),float(q[1]); i,j=int(y),int(x)
        if U2[i,j]<0:                              # the point fell into the sea: move it to the nearest land unit
            for rad in range(4,200,4):
                sub=U2[max(0,i-rad):i+rad+1,max(0,j-rad):j+rad+1]; c=np.argwhere(sub>=0)
                if len(c): b=c[((c-rad)**2).sum(1).argmin()]; y,x=float(max(0,i-rad)+b[0])+6,float(max(0,j-rad)+b[1]); break
    pl.append({'n':n_,'name':nm,'title':t,'c':col,'x':round(x,1),'y':round(y,1),'secret':n_==6,'cr':(round(float(np.sqrt(uarea[NSP+cidx[w]]/np.pi)),1) if isinstance(w,str) else 0),
               'regions':[REGIONS[k][0] for k in RKEYS if REGIONS[k][2]==n_]})
SEAS=[('Атлантический океан',45.3,-8.2,2,-48),('Внутреннее море',35.4,18.0,2,0),('Понт Эвксинский',43.3,34.2,2,0),('Германское море',56.2,3.2,1,0),
 ('Свевское море',55.9,17.6,1,0),('Тирренское море',39.9,12.1,1,0),('Адриатическое море',43.1,15.5,1,-38),('Эгейское море',38.7,25.2,1,0),
 ('Каспийское море',41.8,50.6,1,-70),('Британский океан',49.8,-5.0,1,0),('Ливийское море',33.5,24.5,1,0),('Иберийское море',37.6,2.5,1,0)]
sp=fwd([s[1] for s in SEAS],[s[2] for s in SEAS])
seas=[{'n':s[0],'x':round(float(p[0]),1),'y':round(float(p[1]),1),'big':s[3],'rot':s[4]} for s,p in zip(SEAS,sp)]
for s_ in seas:
    if s_['n'].startswith('Атлант'): s_.update(x=round(0.079*W2,1),y=round(0.468*H2,1),rot=-70,big=1.5)
RANK={1:'столица',2:'имперский центр',3:'крупный город',4:'малый город'}
exec(open('names.py').read())
miss=[g['cs'][0] for g in B['sp'] if g['cs'][0] not in NAMES]
if miss: print('NO ANCIENT NAME FOR:',miss,file=sys.stderr)
units=[{'t':'p','n':NAMES.get(g['cs'][0],g['n']),'pv':g['pv'],'r':int(ureg[i]),'a':ua.get(i),'A':int(uarea[i])} for i,g in enumerate(B['sp'])]
units+=[{'t':'c','n':c['n'],'r':int(ureg[NSP+i]),'pv':c['pv'],'tier':c['t'],'rank':RANK[c['t']],'a':ua.get(NSP+i),'A':int(uarea[NSP+i])} for i,c in enumerate(B['cities'])]
provs=[{'n':p['n'],'r':p['reg'],'a':pa.get(i),'A':int(parea[i])} for i,p in enumerate(B['prov'])]
data={'W':W2,'H':H2,'NSP':NSP,'provs':provs,'arcs':enc,'meta':meta,'rings':{str(k):v for k,v in rings.items()},'units':units,
 'regions':[{'ru':REGIONS[k][0],'realm':realm_of[i],'p':REGIONS[k][2],'a':ra.get(i),'A':int(rarea[i])} for i,k in enumerate(RKEYS)],
 'realms':{k:dict(realms[k],a=rea.get(rix[k]),A=int(earea[rix[k]])) for k in rk},'players':pl,'seas':seas}
js='window.MAP='+json.dumps(data,separators=(',',':'),ensure_ascii=False)+';'
open('data.js','w').write(js); print('data.js',len(js)//1024,'KB; arcs',len(enc),'units',len(units),file=sys.stderr)
def nbrs(i,ring):
    out=set()
    for ref in ring:
        l,r=meta[ref if ref>=0 else ~ref]; out|={l,r}
    out.discard(i); return out
bad=[]
for i,u in enumerate(units):
    if u['t']!='c': continue
    land_rings=[rg for rg in rings.get(i,[]) if any(n>=0 or n==-4 for n in nbrs(i,rg))]
    if len(land_rings)!=1: bad.append((u['n'],len(land_rings)))
print('cities with land holes or pieces:',bad,file=sys.stderr)
wet=sum(1 for i,u in enumerate(units) if u['t']=='c' and any(n in (-9,-5,-3) for rg in rings.get(i,[]) for n in nbrs(i,rg)))
print('cities touching water:',wet,file=sys.stderr)
