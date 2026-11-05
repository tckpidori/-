import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, json
from common import *
from PIL import Image, ImageDraw
exec(open('regions_all.py').read())
b=np.load('base_m2.npz'); land=b['land']; wr=b['wall_region']; emp=b['emp']
ii=np.arange(H)[:,None]; jj=np.arange(W)[None,:]
lat=B1-(ii+0.5)*S; lon=L0+(jj+0.5)*S
def poly_mask(ring):
    im=Image.new('L',(W,H),0); ImageDraw.Draw(im).polygon([((x-L0)/S,(B1-y)/S) for x,y in ring],fill=1); return np.array(im,bool)
dacia=poly_mask([(20.3,44.9),(21.0,44.78),(22.3,44.72),(22.9,44.12),(23.9,43.85),(24.9,43.82),(25.9,43.95),(26.6,44.15),(27.5,44.3),(27.9,45.4),(27.6,48.6),(20.3,48.6)])
agri=poly_mask([(7.65,47.56),(7.62,48.0),(7.85,48.58),(8.48,49.32),(8.42,49.64),(8.33,50.0),(7.65,50.38),(7.45,50.6),(12.5,50.6),(12.5,49.06),(12.1,49.06),(11.4,48.8),(10.8,48.76),(10.0,48.46),(10.05,47.6),(9.6,47.68),(9.0,47.75),(8.6,47.7),(8.2,47.64),(7.65,47.56)])
scot=(lat>54.97)&(lon<-1.3)&(lon>-8)
# Roman land of 365: the 200 CE extent minus Dacia, the Agri Decumates and Scotland; Mesopotamia east of the Khabur lost in 363
east363=(lon>40.6)&(lat<38.6)
roman=land&emp&~dacia&~agri&~scot&~east363
cm=np.zeros((H,W),np.uint8); cm[roman&~wr]=1; cm[land&~roman&~wr]=2
cost=np.exp(0.35*value_noise(11,2.2)+0.2*value_noise(12,0.7)).astype(np.float32)
src=[]; sreg=[]
for r,R_ in enumerate(REGALL):
    name,fac,kind,cities,hints=R_[:5]; rest=R_[5:]
    bits=1 if kind=='R' else 2
    reach=(rest[0] if rest else 330)/KM
    for pt in [(c[1],c[2]) for c in cities]+list(hints):
        i,j=cell(*pt); s=snap(cm&bits>0,i,j)
        if s is None: print('UNSNAPPED',name,pt,file=sys.stderr); continue
        src.append((s[0],s[1],bits,reach)); sreg.append(r)
own,_=grow(cm,cost,src,'reg')
sreg=np.array(sreg+[-1]); reg=np.where(own>=0,sreg[own],-1).astype(np.int32)
# walls take a neighbour
reg[~land]=-9
reg,left=fill_from_neighbours(reg, land&wr, 40); reg[left]=-1; reg[~land]=-9
# roman land not reached: nearest roman anchor within 400 km
un=roman&(reg==-1)
if un.any():
    ui,uj=np.nonzero(un); cl=np.cos(np.radians(LAT[ui])); best=np.full(len(ui),-1); bd=np.full(len(ui),1e18)
    for k,s_ in enumerate(src):
        if s_[2]!=1: continue
        d=((uj-s_[1])*cl)**2+(ui-s_[0])**2; m=d<bd; bd[m]=d[m]; best[m]=sreg[k]
    best[bd>(400/KM)**2]=-1; reg[ui,uj]=best
np.save('reg_all.npy',reg)
F_={'W':(200,80,70),'E':(140,90,180),'G':(150,100,60),'T':(70,120,190),'C':(70,150,90),'N':(160,155,140),'H':(60,60,60),'P':(220,140,60),'A':(240,235,220),'M':(210,180,60)}
rgb=np.zeros((H,W,3),np.uint8); rgb[:]=(30,70,72); rgb[land]=(236,226,196)
for r,R_ in enumerate(REGALL): rgb[reg==r]=np.clip(np.array(F_[R_[1]])+((r*37)%5-2)*12,0,255)
bd=(reg!=np.roll(reg,1,0))|(reg!=np.roll(reg,1,1)); rgb[bd&land]=(20,15,10)
Image.fromarray(rgb).resize((W//3,H//3)).save('reg_all.png')
print('done',file=sys.stderr)
