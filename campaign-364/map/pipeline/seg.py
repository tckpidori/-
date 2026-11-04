import numpy as np, subprocess, sys
from PIL import Image
K=3
src=Image.open('ref.jpg').convert('RGB')
W0,H0=src.size; W,H=W0*K,H0*K
a=np.array(src.resize((W,H),Image.BICUBIC)).astype(np.int16)
R,G,B=a[...,0],a[...,1],a[...,2]
sea_like=(R<110)&(G<130)
LAND=np.array([231,220,190]); WASTE=np.array([212,204,185])
dl=np.abs(a-LAND).sum(-1); dw=np.abs(a-WASTE).sum(-1)
bright=(R>=200)
landc=bright&(dl<=dw)&(dl<30)
wastec=bright&(dw<dl)&(dw<14)
def comps(mask):
    p=subprocess.run(['./label',str(W),str(H)],input=mask.astype(np.uint8).tobytes(),capture_output=True)
    return np.frombuffer(p.stdout,dtype=np.int32).reshape(H,W).copy()
def neighbour_fill(lab, todo, iters=60):
    for _ in range(iters):
        if not todo.any(): break
        for di,dj in ((0,1),(0,-1),(1,0),(-1,0)):
            sh=np.roll(lab,(di,dj),axis=(0,1)); sht=np.roll(todo,(di,dj),axis=(0,1))
            m=todo&~sht; lab[m]=sh[m]; todo=todo&~m
    return lab,todo
# provinces = connected cream areas, big enough
c=comps(landc); ids,cn=np.unique(c[c>=0],return_counts=True)
keep=ids[cn>=60*K*K//9*4]   # ~ 27 px at 3x scale
remap=np.full(c.max()+2,-1); remap[keep]=np.arange(len(keep))
prov=np.where(c>=0, remap[np.maximum(c,0)], -1)
print('province seeds',len(keep),file=sys.stderr)
# wasteland: big flat grey areas
cw=comps(wastec); ids,cn=np.unique(cw[cw>=0],return_counts=True)
waste=np.isin(cw, ids[cn>=2000])
# water: big dark components = seas/lakes; thin ones are rivers drawn on land
cs=comps(sea_like); ids,cn=np.unique(cs[cs>=0],return_counts=True)
water=np.isin(cs, ids[cn>=400])
lab=np.full((H,W),-1,dtype=np.int32)
lab[prov>=0]=prov[prov>=0]
lab[waste]=-4
lab[water]=-9
# every remaining pixel (border lines, rivers, letters, jpeg fringe) takes a neighbour's label
todo=(lab==-1)
lab,left=neighbour_fill(lab,todo,200)
print('unfilled',int(left.sum()),file=sys.stderr)
np.save('lab0.npy',lab)
rng=np.random.default_rng(2); pal=rng.integers(150,240,(len(keep)+10,3)).astype(np.uint8)
rgb=np.zeros((H,W,3),dtype=np.uint8); rgb[:]=(30,72,72)
m=lab>=0; rgb[m]=pal[lab[m]]; rgb[lab==-4]=(212,204,185)
Image.fromarray(rgb).resize((W0,H0),Image.NEAREST).save('seg.png')
