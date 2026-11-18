import sys, os; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0,'.')
import numpy as np, json
from common import *
from PIL import Image, ImageDraw
exec(open('world.py').read())
b=np.load('../ck3/base_m2.npz'); land=b['land']; wr=b['wall_region']; emp=b['emp']
ii=np.arange(H)[:,None]; jj=np.arange(W)[None,:]
lat=B1-(ii+0.5)*S; lon=L0+(jj+0.5)*S
def poly_mask(ring):
    im=Image.new('L',(W,H),0); ImageDraw.Draw(im).polygon([((x-L0)/S,(B1-y)/S) for x,y in ring],fill=1); return np.array(im,bool)
dacia=poly_mask([(20.3,44.9),(21.0,44.78),(22.3,44.72),(22.9,44.12),(23.9,43.85),(24.9,43.82),(25.9,43.95),(26.6,44.15),(27.5,44.3),(27.9,45.4),(27.6,48.6),(20.3,48.6)])
agri=poly_mask([(7.65,47.56),(7.62,48.0),(7.85,48.58),(8.48,49.32),(8.42,49.64),(8.33,50.0),(7.65,50.38),(7.45,50.6),(12.5,50.6),(12.5,49.06),(12.1,49.06),(11.4,48.8),(10.8,48.76),(10.0,48.46),(10.05,47.6),(9.6,47.68),(9.0,47.75),(8.6,47.7),(8.2,47.64),(7.65,47.56)])
scot=(lat>54.97)&(lon<-1.3)&(lon>-8)
# eastern frontier of 365: Nisibis and Singara Persian, the Armenian satrapies beyond the upper Euphrates outside
east=(lon>41.05)|((lat>38.25)&(lat<40.35)&(lon>38.95))|((lat>=40.35)&(lon>41.6))
roman=land&emp&~dacia&~agri&~scot&~east
cm=np.zeros((H,W),np.uint8); cm[roman&~wr]=1; cm[land&~roman&~wr]=2
cost=np.exp(0.35*value_noise(11,2.2)+0.2*value_noise(12,0.7)).astype(np.float32)
src=[]; sreg=[]
for r,P_ in enumerate(PROV):
    bits=P_['bits']; reach=P_['reach']/KM
    for pt in [(c[1],c[2]) for c in P_['cities']]+list(P_['hints']):
        i,j=cell(*pt); s=snap((cm&bits)>0,i,j)
        if s is None: print('UNSNAPPED',P_['n'],pt,'class at point',int(cm[i,j]),file=sys.stderr); continue
        src.append((s[0],s[1],bits,reach)); sreg.append(r)
own,_=grow(cm,cost,src,'reg')
sreg=np.array(sreg+[-1]); reg=np.where(own>=0,sreg[own],-1).astype(np.int32)
reg[~land]=-9
reg,left=fill_from_neighbours(reg, land&wr, 40); reg[left]=-1; reg[~land]=-9
un=roman&(reg==-1)
if un.any():
    ui,uj=np.nonzero(un); cl=np.cos(np.radians(LAT[ui])); best=np.full(len(ui),-1); bd=np.full(len(ui),1e18)
    for k,s_ in enumerate(src):
        if not (s_[2]&1): continue
        d=((uj-s_[1])*cl)**2+(ui-s_[0])**2; m=d<bd; bd[m]=d[m]; best[m]=sreg[k]
    best[bd>(300/KM)**2]=-1; reg[ui,uj]=best
np.save('reg3.npy',reg)
area=np.bincount(reg[reg>=0],minlength=len(PROV))
print('empty provinces:',[PROV[i]['n'] for i in range(len(PROV)) if area[i]==0],file=sys.stderr)
rng=np.random.default_rng(4); pal=rng.integers(110,235,(len(PROV),3)).astype(np.uint8)
rgb=np.zeros((H,W,3),np.uint8); rgb[:]=(30,70,72); rgb[land]=(236,226,196)
m=reg>=0; rgb[m]=pal[reg[m]]
dio=np.array([p['dio'] for p in PROV]); DG=np.where(reg>=0,dio[np.maximum(reg,0)],-1)
bd=(reg!=np.roll(reg,1,0))|(reg!=np.roll(reg,1,1)); rgb[bd&land]=(70,60,50)
bd=(DG!=np.roll(DG,1,0))|(DG!=np.roll(DG,1,1)); rgb[bd&land]=(0,0,0)
Image.fromarray(rgb[int((B1-62)/S):int((B1-22)/S), int((-12-L0)/S):int((56-L0)/S)]).resize((1700,1000)).save('reg3.png')
