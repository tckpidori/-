import sys, os, json, numpy as np, subprocess, struct
from PIL import Image
sys.path.insert(0,'.'); from tps import tps
exec(open('../m2/regions63.py').read())
K=3
lab=np.load('lab0.npy'); H,W=lab.shape
def box(a,r):
    c=np.cumsum(np.cumsum(np.pad(a.astype(np.float32),((r+1,r),(r+1,r))),0),1)
    return (c[2*r+1:,2*r+1:]-c[:-2*r-1,2*r+1:]-c[2*r+1:,:-2*r-1]+c[:-2*r-1,:-2*r-1])/((2*r+1)**2)
def comps(mask):
    p=subprocess.run(['./label',str(W),str(H)],input=mask.astype(np.uint8).tobytes(),capture_output=True)
    return np.frombuffer(p.stdout,dtype=np.int32).reshape(H,W).copy()
def nfill(lab, todo, iters=80):
    lab=lab.copy()
    for _ in range(iters):
        if not todo.any(): break
        for di,dj in ((0,1),(0,-1),(1,0),(-1,0)):
            sh=np.roll(lab,(di,dj),axis=(0,1)); sht=np.roll(todo,(di,dj),axis=(0,1))
            m=todo&~sht; lab[m]=sh[m]; todo=todo&~m
    return lab,todo
def grow(labels, cost, seeds, reach):
    labels.astype(np.int32).tofile('_cm.bin'); cost.astype(np.float32).tofile('_cost.bin')
    with open('_src.bin','wb') as f:
        f.write(struct.pack('i',len(seeds)))
        for i,j in seeds: f.write(struct.pack('iif', int(i)*W+int(j), 0, float(reach)))
    subprocess.run(['./grow2',str(W),str(H),'0','0.000001','_cm.bin','_cost.bin','_src.bin','_own.bin','_dist.bin'],check=True)
    own=np.fromfile('_own.bin',dtype=np.int32).reshape(H,W)
    for s in ('cm','cost','src','own','dist'): os.remove(f'_{s}.bin')
    return own
# ---- rivers: thin water ----
water=lab==-9
core=box(water,9)>0.999
openw=(box(core,11)>0)&water
rivers=water&~openw
p=comps(water&~rivers); ids,cn=np.unique(p[p>=0],return_counts=True)
tinyw=np.isin(p, ids[cn<300])
rivers|=tinyw
lab,left=nfill(np.where(rivers,-1,lab), rivers, 120)
lab[left]=-9
river_mask=rivers
lakes_or_sea=lab==-9
# ---- georeference sample: real region raster -> image provinces ----
sys.path.insert(0,'../m2'); cwd=os.getcwd(); os.chdir('../m2')
from common import F
reg=np.load('reg.npy'); os.chdir(cwd)
S=F['S']; L0=F['L0']; B1=F['B1']
step=3
ri,rj=np.mgrid[0:reg.shape[0]:step,0:reg.shape[1]:step]
rr=reg[ri,rj]; la=B1-(ri+.5)*S; lo=L0+(rj+.5)*S
m=(rr!=-9)&(lo>-14)&(lo<48)&(la>28)&(la<62)
la,lo,rr=la[m],lo[m],rr[m]
xs=[];ys=[]
for a in range(0,len(la),40000):
    x,y=tps(la[a:a+40000],lo[a:a+40000]); xs.append(x); ys.append(y)
x=(np.concatenate(xs)*K).astype(int); y=(np.concatenate(ys)*K).astype(int)
k=(x>=0)&(x<W)&(y>=0)&(y<H); x,y,rr=x[k],y[k],rr[k]
pv=lab[y,x]; k=pv>=0; pv,rr=pv[k],rr[k]
NP0=int(lab.max())+1
votes=np.zeros((NP0,70)); np.add.at(votes,(pv,rr+5),1)
preg=votes.argmax(1)-5; preg[votes.sum(1)==0]=-1
# ---- cities: map into the image; the city's province takes the city's region ----
city_list=[(nm,r,la_,lo_) for r,R_ in enumerate(REG) for (nm,la_,lo_) in R_[3]]
cx,cy=tps(np.array([c[2] for c in city_list]),np.array([c[3] for c in city_list]))
cpos=[]
for (nm,r,_,_),x_,y_ in zip(city_list,cx*K,cy*K):
    i,j=int(y_),int(x_)
    best=None
    for rad in range(0,40,2):
        sub=lab[max(0,i-rad):i+rad+1,max(0,j-rad):j+rad+1]; c=np.argwhere((sub>=0)&(preg[np.maximum(sub,0)]==r))
        if len(c): b=c[((c[:,0]+max(0,i-rad)-i)**2+(c[:,1]+max(0,j-rad)-j)**2).argmin()]; best=(b[0]+max(0,i-rad),b[1]+max(0,j-rad)); break
    if best is None:
        for rad in range(0,40,2):
            sub=lab[max(0,i-rad):i+rad+1,max(0,j-rad):j+rad+1]; c=np.argwhere(sub>=0)
            if len(c): b=c[0]; best=(b[0]+max(0,i-rad),b[1]+max(0,j-rad)); break
        pr=lab[best]; print('city',nm,'forces province region',REG[r][0],'was',preg[pr],file=sys.stderr); preg[pr]=r
    cpos.append(best)
# ---- light enlargement: provinces under 45% of the median size of their region join a same-region neighbour ----
area=np.bincount(lab[lab>=0],minlength=NP0).astype(float)
adj={}
for a_,b_ in ((lab[:,:-1],lab[:,1:]),(lab[:-1,:],lab[1:,:])):
    mm=(a_!=b_)&(a_>=0)&(b_>=0); u,c=np.unique(np.minimum(a_[mm],b_[mm]).astype(np.int64)*NP0+np.maximum(a_[mm],b_[mm]),return_counts=True)
    for kk,cc in zip(u.tolist(),c.tolist()):
        p_,q_=divmod(kk,NP0); dp=adj.setdefault(p_,{}); dq=adj.setdefault(q_,{}); dp[q_]=dp.get(q_,0)+cc; dq[p_]=dq.get(p_,0)+cc
med={}
for r in set(preg.tolist()):
    a_=area[(preg==r)&(area>0)]; med[r]=np.median(a_) if len(a_) else 0
city_prov=set(int(lab[p_]) for p_ in cpos)
parent=list(range(NP0))
def find(z):
    while parent[z]!=z: z=parent[z]
    return z
for p_ in sorted(range(NP0), key=lambda z: area[z]):
    if area[p_]==0 or parent[p_]!=p_ or area[p_]>=0.45*med[preg[p_]]: continue
    cands=[(c,q_) for q_,c in adj.get(p_,{}).items() if find(q_)!=p_ and preg[find(q_)]==preg[p_]]
    if not cands: continue
    cands.sort(key=lambda t:(area[find(t[1])]-t[0]*20))
    q_=find(cands[0][1]); parent[p_]=q_; area[q_]+=area[p_]
root=np.array([find(z) for z in range(NP0)])
lab=np.where(lab>=0, root[np.maximum(lab,0)], lab)
alive=np.unique(lab[lab>=0]); remap=np.full(NP0,-1); remap[alive]=np.arange(len(alive))
lab=np.where(lab>=0, remap[np.maximum(lab,0)], lab); preg=preg[alive]; NP=len(alive)
print('provinces',NP0,'->',NP,file=sys.stderr)
# ---- city enclaves: organic blobs ~5 px of the original image, inside their province ----
rng=np.random.default_rng(3)
def vnoise(cell):
    gh,gw=H//cell+3,W//cell+3; g=rng.uniform(-1,1,(gh,gw)).astype(np.float32)
    ys=np.arange(H)/cell; xs=np.arange(W)/cell; y0=ys.astype(int); x0=xs.astype(int)
    fy=(ys-y0)[:,None].astype(np.float32); fx=(xs-x0)[None,:].astype(np.float32); fy=fy*fy*(3-2*fy); fx=fx*fx*(3-2*fx)
    return g[y0][:,x0]*(1-fy)*(1-fx)+g[y0][:,x0+1]*(1-fy)*fx+g[y0+1][:,x0]*fy*(1-fx)+g[y0+1][:,x0+1]*fy*fx
cost=np.exp(0.5*vnoise(9)+0.3*vnoise(4)).astype(np.float32)
cown=grow(lab, cost, cpos, 13.0)
U=lab.copy(); U[cown>=0]=NP+cown[cown>=0]
np.save('U.npy',U); np.save('rivers.npy',river_mask)
json.dump({'NP':NP,'preg':preg.tolist(),'cities':[{'name':nm,'r':r,'lat':a_,'lon':b_,'x':int(p_[1]),'y':int(p_[0])} for (nm,r,a_,b_),p_ in zip(city_list,cpos)]},open('build.json','w'))
# preview by faction
FC={'W':(205,95,85),'E':(150,105,190),'G':(165,115,70),'T':(85,130,195),'C':(85,160,100),'N':(170,165,150)}
rgb=np.zeros((H,W,3),dtype=np.uint8); rgb[:]=(31,72,72)
land=U!=-9; rgb[land]=(231,220,190); rgb[U==-4]=(212,204,185)
for p_ in range(NP):
    pass
pr=np.where(U>=0, np.where(U<NP, preg[np.minimum(np.maximum(U,0),NP-1)], -3), -3)
for r,R_ in enumerate(REG):
    c=np.array(FC[R_[1]]); rgb[pr==r]=(0.55*c+0.45*np.array([231,220,190])).astype(np.uint8)
rgb[(U>=NP)]=(120,40,35)
bd=((U!=np.roll(U,1,0))|(U!=np.roll(U,1,1)))&land; rgb[bd]=(70,60,50)
rb=((pr!=np.roll(pr,1,0))|(pr!=np.roll(pr,1,1)))&land&(pr>=-3); rgb[rb&(pr>=0)]=(15,10,10)
rgb[river_mask]=(31,72,72)
Image.fromarray(rgb).resize((W//2,H//2),Image.BILINEAR).save('build.png')
Image.fromarray(rgb[int(380*K):int(560*K),int(250*K):int(560*K)]).save('build_zoom.png')
