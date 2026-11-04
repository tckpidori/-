import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sys, numpy as np, json
from common import *
exec(open('regions63.py').read())
b=np.load('base.npz'); land=b['land']; roman=b['roman']; wr=b['wall_region']
cm=np.zeros((H,W),dtype=np.uint8)
cm[roman & ~wr]=1
cm[land & ~roman & ~wr]=2
cost=np.exp(0.35*value_noise(11,2.2)+0.2*value_noise(12,0.7)).astype(np.float32)
src=[]; srcreg=[]; srcreach=[]
for r,(name,fac,kind,cities,hints,*rest) in enumerate(REG):
    bits=1 if kind=='R' else 2
    reach=(rest[0] if rest else 330)/KM
    for pt in [(c[1],c[2]) for c in cities]+hints:
        i,j=cell(*pt); s=snap(cm&bits>0, i, j)
        if s is None: print('UNSNAPPED',name,pt,file=sys.stderr); continue
        src.append((s[0],s[1],bits,reach)); srcreg.append(r); srcreach.append(reach)
own,dist=grow(cm,cost,src,'reg')
srcreg=np.array(srcreg+[-1],dtype=np.int32)
reg=np.where(own>=0, srcreg[own], -1).astype(np.int32)
# Roman land not reached (anchorless province pockets): nearest Roman anchor, report big ones
un=roman & ~wr & (reg<0)
if un.any():
    ui,uj=np.nonzero(un)
    rsrc=[(k,s) for k,s in enumerate(src) if s[2]==1]
    best=np.full(len(ui),-1); bd=np.full(len(ui),1e18)
    cl=np.cos(np.radians(LAT[ui]))
    lim=np.zeros(len(ui))
    for k,s in rsrc:
        d=((uj-s[1])*cl)**2+(ui-s[0])**2; m=d<bd; bd[m]=d[m]; best[m]=srcreg[k]; lim[m]=srcreach[k]
    best[bd>lim**2]=-1
    reg[ui,uj]=best
    from collections import Counter
    print('roman pockets filled:',len(ui),'cells', Counter(REG[x][0] if x>=0 else '-' for x in best).most_common(8),file=sys.stderr)
# walls on land take a neighbour's region
reg[~land]=-9
reg,left=fill_from_neighbours(reg, land & wr)
reg[left]=-1
reg[~land]=-9
np.save('reg.npy',reg)
# report
for r,R_ in enumerate(REG):
    n=(reg==r).sum(); print(f'{r+1:2d} {R_[0]:24s} {n*KM*KM*0.7:9.0f} km2', file=sys.stderr)
# preview
F_={'W':(200,80,70),'E':(140,90,180),'G':(150,100,60),'T':(70,120,190),'C':(70,150,90),'N':(160,155,140)}
rgb=np.zeros((H,W,3),dtype=np.uint8); rgb[:]=(30,70,72); rgb[land]=(236,226,196)
for r,R_ in enumerate(REG):
    col=np.clip(np.array(F_[R_[1]])+((r*37)%5-2)*12,0,255); rgb[reg==r]=col
bd=(reg!=np.roll(reg,1,0))|(reg!=np.roll(reg,1,1)); rgb[bd&land]=(30,25,20)
from PIL import Image; Image.fromarray(rgb).resize((W//3,H//3)).save('reg.png')
