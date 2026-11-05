import numpy as np, csv, re, json, unicodedata, sys
K='/home/user/ck3src/The-Kingdom-of-Heaven/'
pid=np.load('pid.npy'); H,W=pid.shape
rows=[r for r in csv.reader(open(K+'map_data/definition.csv',encoding='utf-8-sig',errors='replace'),delimiter=';') if r and r[0].strip().isdigit()]
names={int(r[0]):r[4] for r in rows}
t=open(K+'common/landed_titles/00_landed_titles.txt',encoding='utf-8-sig',errors='replace').read()
land=set(int(x) for x in re.findall(r'province\s*=\s*(\d+)',t))
def norm(s): return ''.join(ch for ch in unicodedata.normalize('NFKD',s or '') if not unicodedata.combining(ch)).lower().replace('-',' ').replace("'",'').replace('_',' ').strip()
cnt=np.bincount(pid.ravel()); ys,xs=np.indices(pid.shape)
sx=np.bincount(pid.ravel(),weights=xs.ravel()); sy=np.bincount(pid.ravel(),weights=ys.ravel())
PP=json.load(open('/home/user/nvkelso/natural-earth-vector/geojson/ne_10m_populated_places.geojson'))
places={}
for ft in PP['features']:
    p=ft['properties']; la,lo=p['LATITUDE'],p['LONGITUDE']
    if not(15<la<68 and -25<lo<70): continue
    for nm in [p.get('NAME'),p.get('NAMEASCII')]+((p.get('NAMEALT') or '').split('|')):
        if nm: places.setdefault(norm(nm),[]).append((la,lo,p.get('POP_MAX') or 0))
cands=[]
for k in land:
    if k>=len(cnt) or cnt[k]==0: continue
    nm=norm(names.get(k,''))
    if nm in places:
        for la,lo,pop in places[nm]: cands.append((la,lo,sx[k]/cnt[k],sy[k]/cnt[k],k,nm))
print('raw candidate pairs',len(cands),file=sys.stderr)
C=np.array([c[:4] for c in cands])
# robust global fit first: affine-ish polynomial in (lon,lat) -> (x,y) with RANSAC-like trimming
def feats(lo,la):
    x=(lo-15)/30; y=(la-45)/15
    return np.stack([np.ones_like(x),x,y,x*x,x*y,y*y,x**3,x*x*y,x*y*y,y**3],1)
keep=np.ones(len(C),bool)
for it in range(8):
    F_=feats(C[keep,1],C[keep,0]); bx=np.linalg.lstsq(F_,C[keep,2],rcond=None)[0]; by=np.linalg.lstsq(F_,C[keep,3],rcond=None)[0]
    F2=feats(C[:,1],C[:,0]); r=np.hypot(F2@bx-C[:,2],F2@by-C[:,3])
    thr=max(25,3*np.median(r[keep])); keep=r<thr
    print('iter',it,'kept',int(keep.sum()),'median res',round(float(np.median(r[keep])),1),file=sys.stderr)
# one candidate per barony: the best one
best={}
for i in np.nonzero(keep)[0]:
    k=cands[i][4]
    if k not in best or r[i]<r[best[k]]: best[k]=i
sel=np.array(sorted(best.values()))
P=C[sel]
print('control points',len(P),file=sys.stderr)
def U_(r2): return np.where(r2>0,r2*np.log(r2+1e-12),0.0)
def tps_fit(src,dst,lam):
    n=len(src); Kx=U_(((src[:,None]-src[None])**2).sum(-1))+lam*np.eye(n); Q=np.hstack([np.ones((n,1)),src])
    A=np.zeros((n+3,n+3)); A[:n,:n]=Kx; A[:n,n:]=Q; A[n:,:n]=Q.T
    out=[]
    for j in range(dst.shape[1]):
        b=np.zeros(n+3); b[:n]=dst[:,j]; out.append(np.linalg.solve(A,b))
    return src,np.array(out)
def tps_apply(m,X):
    src,w=m; n=len(src); out=[]
    for s in range(0,len(X),20000):
        x=X[s:s+20000]; Kx=U_(((x[:,None]-src[None])**2).sum(-1)); Q=np.hstack([np.ones((len(x),1)),x])
        out.append(np.stack([Kx@w[j][:n]+Q@w[j][n:] for j in range(w.shape[0])],1))
    return np.concatenate(out)
geo_n=lambda la,lo: np.stack([(np.asarray(lo)-15)/30,(np.asarray(la)-45)/15],1)
px_n=lambda x,y: np.stack([(np.asarray(x)-2000)/1000,(np.asarray(y)-1900)/1000],1)
# forward real->ck3 and inverse ck3->real, with outlier trimming
keep=np.ones(len(P),bool)
for it in range(10):
    fwd=tps_fit(geo_n(P[keep,0],P[keep,1]),P[keep][:,2:4],0.02)
    pr=tps_apply(fwd,geo_n(P[:,0],P[:,1])); res=np.hypot(pr[:,0]-P[:,2],pr[:,1]-P[:,3])
    bad=keep&(res>max(9,3*np.median(res[keep])))
    if not bad.any(): break
    keep&=~bad
inv=tps_fit(px_n(P[keep,2],P[keep,3]),P[keep][:,0:2],0.02)
# leave-one-out error on a sample
idx=np.nonzero(keep)[0]; rng=np.random.default_rng(0); loo=[]
for i in rng.choice(idx,size=min(80,len(idx)),replace=False):
    m=keep.copy(); m[i]=False; f=tps_fit(geo_n(P[m,0],P[m,1]),P[m][:,2:4],0.02); q=tps_apply(f,geo_n(P[i:i+1,0],P[i:i+1,1]))[0]
    loo.append(float(np.hypot(q[0]-P[i,2],q[1]-P[i,3])))
print('kept',int(keep.sum()),'| LOO error CK3 px: median',round(float(np.median(loo)),1),'p90',round(float(np.percentile(loo,90)),1),file=sys.stderr)
np.save('geo.npy',np.array([fwd[0],fwd[1],inv[0],inv[1]],dtype=object),allow_pickle=True)
# frame: where do key places land?
for nm,la,lo in [('Galway',53.27,-9.05),('Thurso',58.6,-3.5),('Lisbon',38.72,-9.14),('Agadir',30.4,-9.6),('Aswan',24.1,32.9),('Baghdad',33.3,44.4),('Basra',30.5,47.8),('Caspian E',41,53),('Kazan',55.8,49.1),('Volga mouth',46.3,48),('Isfahan',32.65,51.67),('Bergen',60.4,5.3)]:
    q=tps_apply(fwd,geo_n([la],[lo]))[0]; print(f'{nm:12s} x {q[0]:7.0f} y {q[1]:7.0f}',file=sys.stderr)
