import sys, os, json, numpy as np, subprocess, struct
sys.path.insert(0,'.'); from tps import tps; from vec import vectorize
exec(open('../m2/regions63.py').read())
K=3
U=np.load('U.npy'); rivers=np.load('rivers.npy'); B=json.load(open('build.json')); NP=B['NP']; preg=np.array(B['preg'])
H,W=U.shape
NC=len(B['cities'])
# region of every unit
ureg=np.concatenate([preg, np.array([c['r'] for c in B['cities']])])
# faction hints for land outside the 63 regions (lat, lon, faction, reach km)
HINT=[]
for p in [(40.5,30),(39.5,27.5),(38.0,28.0),(37.5,30.5),(39.9,32.9),(38.7,35.5),(40.6,36.0),(41.0,39.7),(38.4,38.3),(37.0,35.0),(36.2,36.2),(37.2,38.8),(37.9,40.2),(34.5,36.5),(33.5,36.3),(32.5,35.0),(31.5,35.0),(31.2,29.9),(30.5,31.2),(27.0,31.0),(25.7,32.6),(32.8,21.9),(31.3,27.2),(35.1,33.4),(34.5,38.3)]: HINT.append((p[0],p[1],'E',260))
for p in [(33.1,44.6),(36.2,44.0),(34.8,48.5),(36.9,46.3),(32.2,48.3),(30.9,47.6),(37.0,41.2),(38.0,42.5),(35.5,51.4),(32.6,51.7),(29.6,52.5)]: HINT.append((p[0],p[1],'P',300))
for p in [(40.0,44.6),(38.5,43.4),(38.9,41.5),(40.5,43.0),(39.5,45.5)]: HINT.append((p[0],p[1],'A',170))
for p in [(46.4,47.9),(48.0,45.0),(47.5,51.0),(45.5,46.0),(49.0,48.0),(50.0,52.0)]: HINT.append((p[0],p[1],'H',350))
for p in [(48.5,35.1),(49.6,31.3),(46.7,36.8),(47.5,33.0),(50.0,33.5),(48.0,30.0)]: HINT.append((p[0],p[1],'T',230))
for p in [(35.2,24.9)]: HINT.append((p[0],p[1],'W',120))
for p in [(45.0,34.0),(44.9,41.2),(47.3,40.0),(42.3,42.0),(41.8,44.7),(41.0,47.3)]: HINT.append((p[0],p[1],'N',150))
HL=np.array([[h[0],h[1],h[3]] for h in HINT]); HF=[h[2] for h in HINT]
la,lo=np.mgrid[24:62:0.1,-14:56:0.1]; la=la.ravel(); lo=lo.ravel()
d=np.full(len(la),1e9); f=np.full(len(la),-1)
for k,(a,b,r) in enumerate(HL):
    dk=np.hypot((lo-b)*np.cos(np.radians(la)),la-a)*111.2
    m=(dk<r)&(dk<d); d[m]=dk[m]; f[m]=k
keep=f>=0; la,lo,f=la[keep],lo[keep],f[keep]
xs=[];ys=[]
for a in range(0,len(la),40000):
    x,y=tps(la[a:a+40000],lo[a:a+40000]); xs.append(x); ys.append(y)
x=(np.concatenate(xs)*K).astype(int); y=(np.concatenate(ys)*K).astype(int)
k=(x>=0)&(x<W)&(y>=0)&(y<H); x,y,f=x[k],y[k],f[k]
u=U[y,x]; k=(u>=0)&(u<NP); u,f=u[k],f[k]
FACS=['W','E','G','T','H','P','A','M','C','N']
fi=np.array([FACS.index(HF[z]) for z in f])
votes=np.zeros((NP,len(FACS))); np.add.at(votes,(u,fi),1)
ufac=[]
for p in range(NP+NC):
    r=int(ureg[p])
    if r>=0: ufac.append(REG[r][1])
    elif p<NP and votes[p].sum()>0: ufac.append(FACS[int(votes[p].argmax())])
    else: ufac.append('')
# label anchors: deepest point of each unit and of each region
def deepest(lab):
    b=(lab!=np.roll(lab,1,0))|(lab!=np.roll(lab,-1,0))|(lab!=np.roll(lab,1,1))|(lab!=np.roll(lab,-1,1))
    lab.astype(np.int32).tofile('_cm.bin'); np.ones(lab.shape,np.float32).tofile('_cost.bin')
    si,sj=np.nonzero(b&(lab>=0))
    with open('_src.bin','wb') as fh:
        fh.write(struct.pack('i',len(si)))
        for i,j in zip(si.tolist(),sj.tolist()): fh.write(struct.pack('iif',i*W+j,0,1e9))
    subprocess.run(['./grow2',str(W),str(H),'0','0.000001','_cm.bin','_cost.bin','_src.bin','_own.bin','_dist.bin'],check=True)
    dist=np.fromfile('_dist.bin',dtype=np.float32).reshape(lab.shape)
    for s in ('cm','cost','src','own','dist'): os.remove(f'_{s}.bin')
    m=lab>=0; L=lab[m]; D=dist[m]; idx=np.nonzero(m)
    order=np.lexsort((-D,L)); Ls=L[order]; first=np.r_[True,Ls[1:]!=Ls[:-1]]
    res={}
    for o in order[first]: res[int(L[o])]=[int(idx[1][o]),int(idx[0][o]),round(float(D[o]),1)]
    return res
ua=deepest(U)
RL=np.where(U>=0, ureg[np.maximum(U,0)], -1)
ra=deepest(RL)
area=np.bincount(U[U>=0],minlength=NP+NC)
rarea=np.bincount(RL[RL>=0],minlength=63)
# vectorize units (provinces, cities, waste, sea) and rivers
enc,meta,rings=vectorize(U,1.1)
def box(a,r):
    c=np.cumsum(np.cumsum(np.pad(a.astype(np.float32),((r+1,r),(r+1,r))),0),1)
    return (c[2*r+1:,2*r+1:]-c[:-2*r-1,2*r+1:]-c[2*r+1:,:-2*r-1]+c[:-2*r-1,:-2*r-1])/((2*r+1)**2)
rv=rivers&(U!=-9)
edge=rv&~(np.roll(rv,1,0)&np.roll(rv,-1,0)&np.roll(rv,1,1)&np.roll(rv,-1,1))
labr=np.where(rv,0,-1).astype(np.int32); labr.tofile('_cm.bin'); np.ones(U.shape,np.float32).tofile('_cost.bin')
si,sj=np.nonzero(edge)
with open('_src.bin','wb') as fh:
    fh.write(struct.pack('i',len(si)))
    for i,j in zip(si.tolist(),sj.tolist()): fh.write(struct.pack('iif',i*W+j,0,1e9))
subprocess.run(['./grow2',str(W),str(H),'0','0.000001','_cm.bin','_cost.bin','_src.bin','_own.bin','_dist.bin'],check=True)
rd=np.fromfile('_dist.bin',dtype=np.float32).reshape(U.shape)
for s_ in ('cm','cost','src','own','dist'): os.remove(f'_{s_}.bin')
thin=rv&(rd>=2.6)
renc,rmeta,rrings=vectorize(np.where(thin,0,-1).astype(np.int32),1.0)
players=[(1,'Валентиниан','Augustus, император Запада','W','Mediolanum'),(2,'Иовин','Magister Equitum per Gallias','W','Augusta Treverorum'),
 (3,'Феодосий','Comes Hispaniarum','W','Emerita Augusta'),(4,'Валент','Augustus, император Востока','E','Nova Roma'),
 (5,'Лупицин','Magister Equitum per Orientem','E',(36.2,36.16)),(6,'Прокопий','Usurpator, тайное убежище','E',(44.61,33.49)),
 (7,'Макриан','Rex Alamannorum','G','Cannstatt'),(8,'Маллобауд','Rex Francorum','G',(51.6,7.3)),(9,'Эрманарих','Rex Gothorum (гревтунги)','T',(48.5,35.1)),
 (10,'Атанарих','Iudex Tervingorum','T',(44.9,26.1)),(11,'Баламбер','Rex Hunnorum','H',(46.4,47.9)),(12,'Шапур II','Šāhān šāh','P',(33.1,44.58)),
 (13,'Аршак II','Thagavor Hayots','A',(40.0,44.58)),(14,'Нубель','Regulus Maurorum','M','Iol Caesarea'),(15,'Кримтанн мак Фидах','Rí Érenn','C',(52.52,-7.89))]
cityidx={c['name']:k for k,c in enumerate(B['cities'])}
pl=[]
for n,nm,t,fa,where in players:
    if isinstance(where,str): c=B['cities'][cityidx[where]]; x,y=c['x'],c['y']
    else: xx,yy=tps(np.array([where[0]]),np.array([where[1]])); x,y=int(xx[0]*K),int(yy[0]*K)
    u=int(U[min(max(y,0),H-1),min(max(x,0),W-1)])
    pl.append({'n':n,'name':nm,'title':t,'f':fa,'x':x,'y':y,'u':u,'secret':n==6})
SEAS=[('Oceanus Atlanticus',95,520),('Mare Germanicum',395,150),('Oceanus Britannicus',225,330),('Mare Hibernicum',190,215),('Sinus Aquitanicus',235,410),
 ('Mare Suebicum',655,160),('Mare Internum',330,595),('Mare Tyrrhenum',530,560),('Mare Hadriaticum',590,495),('Mare Ionium',640,640),
 ('Mare Aegaeum',785,615),('Mare Libycum',600,690),('Pontus Euxinus',880,455),('Mare Caspium',1100,515),('Mare Syriacum',855,660)]
seas=[{'n':s_[0],'x':float(s_[1]*K),'y':float(s_[2]*K)} for s_ in SEAS]
rvd=box(rivers,3)>0
river_arcs=[]
for k,a in enumerate(enc):
    x,y=a[0],a[1]; pts=[(x,y)]
    for t in range(2,len(a),2): x+=a[t]; y+=a[t+1]; pts.append((x,y))
    if len(pts)<2: continue
    # sample along the arc
    hits=0; tot=0
    for (x0,y0),(x1,y1) in zip(pts[:-1],pts[1:]):
        n=max(1,int(max(abs(x1-x0),abs(y1-y0))))
        for t in range(n):
            xx=int(x0+(x1-x0)*t/n); yy=int(y0+(y1-y0)*t/n)
            if 0<=xx<W and 0<=yy<H: tot+=1; hits+=rvd[yy,xx]
    l,r=meta[k]
    if tot>=6 and hits/tot>0.7 and l!=-9 and r!=-9: river_arcs.append(k)
data={'rv':river_arcs,'W':W,'H':H,'NP':NP,'arcs':enc,'meta':meta,'rings':{str(k):v for k,v in rings.items()},
 'rarcs':[],'rrings':[],
 'units':[{'r':int(ureg[p]),'f':ufac[p],'a':ua.get(p),'A':int(area[p])} for p in range(NP+NC)],
 'cities':[{'n':c['name'],'r':c['r']} for c in B['cities']],
 'regions':[{'n':R_[0],'f':R_[1],'a':ra.get(r),'A':int(rarea[r])} for r,R_ in enumerate(REG)],
 'players':pl,'seas':seas}
js='window.MAP='+json.dumps(data,separators=(',',':'),ensure_ascii=False)+';'
open('data.js','w').write(js); print('data.js',len(js)//1024,'KB','arcs',len(enc),'river arcs',len(renc),file=sys.stderr)
