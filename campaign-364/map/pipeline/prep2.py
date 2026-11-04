import json, math, sys, subprocess, numpy as np
from PIL import Image, ImageDraw
NE='/home/user/nvkelso/natural-earth-vector/geojson/'
AW='/home/user/awmc/geodata/Cultural-Data/political_shading/'
S=0.02; L0,L1,B0,B1=-16.0,56.0,21.0,62.0
W=int(round((L1-L0)/S)); H=int(round((B1-B0)/S))
def px(lon,lat): return ((lon-L0)/S, (B1-lat)/S)   # pixel coords (x right, y down), cell (i,j) covers [j,j+1)x[i,i+1)

# ---------- land mask (even-odd over all rings) ----------
geo=json.loads(open('geo.js').read()[len('window.GEO='):-1])
img=Image.new('1',(W,H),0); d=ImageDraw.Draw(img)
# PIL polygon fill is nonzero-ish per polygon call; draw outers then holes separately via xor on an 'L' image
acc=np.zeros((H,W),dtype=np.uint8)
def fill_ring(ring, val):
    im=Image.new('L',(W,H),0); ImageDraw.Draw(im).polygon([px(x,y) for x,y in ring], fill=1)
    return np.array(im,dtype=np.uint8)
for poly in geo['land']['coordinates']:
    for ring in poly: acc^=fill_ring(ring,1)
for poly in geo['lakes']['coordinates']:
    acc[fill_ring(poly[0],1)==1]=0
land=acc.astype(bool)
print('land cells',land.sum(),'of',W*H,file=sys.stderr)

# ---------- walls ----------
wall=Image.new('L',(W,H),0); wd=ImageDraw.Draw(wall)
def line(coords):
    pts=[px(x,y) for x,y in coords]
    wd.line(pts, fill=1, width=1)
pd=json.load(open(AW+'roman_empire_provinces post_diocletian/roman_empire_provinces post_diocletian.geojson'))
for ft in pd['features']: line(ft['geometry']['coordinates'])
ex=json.load(open(AW+'roman_empire_ce_200_extent/roman_empire_ce_200_extent.geojson'))
for ft in ex['features']:
    g=ft['geometry']; polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    for poly in polys:
        for ring in poly: line(ring)
riv=json.load(open(NE+'ne_50m_rivers_lake_centerlines.geojson'))
RW={'Rhine','Danube','Dniester','Don'}
for ft in riv['features']:
    if (ft['properties'].get('name_en') or ft['properties'].get('name')) not in RW: continue
    g=ft['geometry']
    for ln in (g['coordinates'] if g['type']=='MultiLineString' else [g['coordinates']]): line(ln)
# manual walls: Hadrian's wall, Tingitana south limit, Tervingi/Carpathian line
for ln in [[(-3.2,54.95),(-2.5,54.98),(-1.6,55.0),(-1.4,55.0)]]: line(ln)
wall=np.array(wall,dtype=bool)
# inside the empire of 200 CE every land cell is claimed (limit doubled); outside, a city's reach is organic
emp=np.zeros((H,W),dtype=np.uint8)
for ft in ex['features']:
    g=ft['geometry']; polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    for poly in polys: emp|=fill_ring(poly[0],1)
emp=emp.astype(bool)
free=land & ~wall
print('wall cells',wall.sum(),file=sys.stderr)

# ---------- components ----------
p=subprocess.run(['./label',str(W),str(H)],input=free.astype(np.uint8).tobytes(),capture_output=True)
comp=np.frombuffer(p.stdout,dtype=np.int32).reshape(H,W).copy()
print(p.stderr.decode().strip(),file=sys.stderr)

# ---------- sites ----------
R=[r for r in json.load(open('regions.json')) if r['f']!='X']
REACH={'W':230,'E':230,'G':280,'T':330,'H':650,'P':320,'A':220,'M':170,'C':260,'N':280}
reach=np.array([r.get('reach',REACH[r['f']]) for r in R],dtype=np.float32)
sx=np.array([(r['lon']-L0)/S-0.5 for r in R]); sy=np.array([(B1-r['lat'])/S-0.5 for r in R])
sj=np.clip(np.round(sx).astype(int),0,W-1); si=np.clip(np.round(sy).astype(int),0,H-1)
# snap sites that fall on sea or wall cells to the nearest free cell (radius 12 cells)
for k,r in enumerate(R):
    if comp[si[k],sj[k]]>=0 or r['f']=='X': continue
    best=None
    for rad in range(1,13):
        i0,i1=max(0,si[k]-rad),min(H-1,si[k]+rad); j0,j1=max(0,sj[k]-rad),min(W-1,sj[k]+rad)
        sub=comp[i0:i1+1,j0:j1+1]; cand=np.argwhere(sub>=0)
        if len(cand):
            d=(cand[:,0]+i0-sy[k])**2+(cand[:,1]+j0-sx[k])**2; b=cand[d.argmin()]; best=(b[0]+i0,b[1]+j0); break
    if best is None: print('SITE UNPLACEABLE:',r['la'],file=sys.stderr)
    else: si[k],sj[k]=best; sx[k],sy[k]=float(best[1]),float(best[0])
site_comp=comp[si,sj]
# noise fields (value noise, 2 octaves) in pixel units
rng=np.random.default_rng(7)
def value_noise(cell_deg, amp_deg):
    gw=int(W*S/cell_deg)+3; gh=int(H*S/cell_deg)+3
    g=rng.uniform(-1,1,(gh,gw))
    ys=np.arange(H)*S/cell_deg; xs=np.arange(W)*S/cell_deg
    y0=np.floor(ys).astype(int); x0=np.floor(xs).astype(int); fy=(ys-y0)[:,None]; fx=(xs-x0)[None,:]
    fy=fy*fy*(3-2*fy); fx=fx*fx*(3-2*fx)
    v=(g[y0][:,x0]*(1-fy)*(1-fx)+g[y0][:,x0+1]*(1-fy)*fx+g[y0+1][:,x0]*fy*(1-fx)+g[y0+1][:,x0+1]*fy*fx)
    return (v*amp_deg/S).astype(np.float32)
NX=value_noise(1.2,0.45)+value_noise(0.45,0.18); NY=value_noise(1.2,0.45)+value_noise(0.45,0.18)
lab=np.full((H,W),-1,dtype=np.int32)
ii,jj=np.indices((H,W))
coslat=np.cos(np.radians(B1-(ii+0.5)*S)).astype(np.float32)
ncomp=comp.max()+1
comp_sites={}
for k in range(len(R)): comp_sites.setdefault(int(site_comp[k]),[]).append(k)
orphan=[]
for c in range(ncomp):
    cells=np.nonzero(comp==c); n=len(cells[0])
    if n==0: continue
    ks=comp_sites.get(c)
    if not ks:
        orphan.append((n,c)); continue
    ci,cj=cells
    # noisy voronoi, distances in km (lon scaled by cos lat); a cell farther than the site's reach stays unclaimed (-3)
    nx=(cj+NX[ci,cj])*coslat[ci,cj]; ny=ci+NY[ci,cj]
    best=None; bestd=None
    for k in ks:
        dx=nx-sx[k]*coslat[ci,cj]; dy=ny-sy[k]; dd=(dx*dx+dy*dy)*(S*111.0)**2
        if best is None: best=np.full(n,k,dtype=np.int32); bestd=dd
        else: m=dd<bestd; best[m]=k; bestd[m]=dd[m]
    lim=reach[best]*np.where(emp[ci,cj],3.0,1.0)
    best[bestd>lim*lim]=-3
    lab[cells]=best
# orphans: nearest site overall, no noise; report big ones
orphan.sort(reverse=True)
for n,c in orphan:
    cells=np.nonzero(comp==c); ci,cj=cells
    nx=(cj+NX[ci,cj])*coslat[ci,cj]; ny=ci+NY[ci,cj]; best=None; bestd=None
    for k in range(len(R)):
        dx=nx-sx[k]*coslat[ci,cj]; dy=ny-sy[k]; dd=(dx*dx+dy*dy)*(S*111.0)**2
        if best is None: best=np.full(len(ci),k,dtype=np.int32); bestd=dd
        else: m=dd<bestd; best[m]=k; bestd[m]=dd[m]
    lim=reach[best]*np.where(emp[ci,cj],3.0,1.0)
    best[bestd>lim*lim]=-3
    lab[cells]=best
# wall cells on land: take label from neighbours (iterate)
for it in range(4):
    un=(lab==-1)&land
    if not un.any(): break
    for di,dj in ((0,1),(0,-1),(1,0),(-1,0)):
        sh=np.roll(lab,(di,dj),axis=(0,1))
        m=un&((sh>=0)|(sh==-3))&(lab==-1); lab[m]=sh[m]
lab[(lab==-1)&land]=-3
lab[~land]=-1
np.save('lab.npy',lab)
# debug image
pal=np.array([[0,0,0]]+[[(k*67)%200+30,(k*131)%200+30,(k*199)%200+30] for k in range(len(R))],dtype=np.uint8)
F={'W':(200,80,70),'E':(140,90,180),'G':(150,100,60),'T':(70,120,190),'H':(50,50,50),'P':(220,140,60),'A':(240,235,220),'M':(210,180,60),'C':(70,150,90),'N':(160,155,140),'X':(225,215,195)}
rgb=np.zeros((H,W,3),dtype=np.uint8); rgb[:]= (200,215,220)
rgb[lab==-3]=(228,220,200)
for k,r in enumerate(R):
    m=lab==k; col=np.array(F[r['f']],dtype=np.int32); col=np.clip(col+((k*37)%3-1)*14,0,255); rgb[m]=col
# borders
b=(lab!=np.roll(lab,1,axis=0))|(lab!=np.roll(lab,1,axis=1)); rgb[b&land]=(40,30,20)
Image.fromarray(rgb).resize((W//2,H//2)).save('raster.png'); json.dump(R,open('regions_used.json','w'),ensure_ascii=False)
print('done',file=sys.stderr)
