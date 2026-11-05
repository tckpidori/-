import json, sys, numpy as np, subprocess, struct
from PIL import Image, ImageDraw
NE='/home/user/nvkelso/natural-earth-vector/geojson/'
AW='/home/user/awmc/geodata/Cultural-Data/political_shading/'
S=0.02; L0,L1,B0,B1=-26.0,64.0,19.0,66.0
W=int(round((L1-L0)/S)); H=int(round((B1-B0)/S)); N=W*H
def px(lon,lat): return ((lon-L0)/S,(B1-lat)/S)
def poly_mask(rings):
    im=Image.new('L',(W,H),0); d=ImageDraw.Draw(im)
    for ring in rings: d.polygon([px(x,y) for x,y in ring],fill=1)
    return np.array(im,dtype=np.uint8)
def xor_rings(rings):
    acc=np.zeros((H,W),dtype=np.uint8)
    for ring in rings:
        xs=[p[0] for p in ring]; ys=[p[1] for p in ring]
        if max(xs)<L0 or min(xs)>L1 or max(ys)<B0 or min(ys)>B1: continue
        acc^=poly_mask([ring])
    return acc
land_gj=json.load(open(NE+'ne_50m_land.geojson'))
rings=[]
for f in land_gj['features']:
    g=f['geometry']
    for poly in (g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]):
        rings+=poly
land=xor_rings(rings).astype(bool)
lk=json.load(open(NE+'ne_50m_lakes.geojson'))
lrings=[]
for f in lk['features']:
    g=f['geometry']
    for poly in (g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]): lrings.append(poly[0])
lakes=xor_rings(lrings).astype(bool)
land&=~lakes
print('land',land.sum(),file=sys.stderr)

def lines_mask(lines,width=1):
    im=Image.new('L',(W,H),0); d=ImageDraw.Draw(im)
    for ln in lines: d.line([px(x,y) for x,y in ln],fill=1,width=width)
    return np.array(im,dtype=bool)
# region-level walls: AWMC province lines, 200 CE empire outline, Rhine, Danube, Hadrian + Antonine walls
pd=json.load(open(AW+'roman_empire_provinces post_diocletian/roman_empire_provinces post_diocletian.geojson'))
prov_lines=[ft['geometry']['coordinates'] for ft in pd['features']]
ex=json.load(open(AW+'roman_empire_ce_200_extent/roman_empire_ce_200_extent.geojson'))
ext_rings=[]
for ft in ex['features']:
    g=ft['geometry']
    for poly in (g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]): ext_rings+=poly
riv=json.load(open(NE+'ne_50m_rivers_lake_centerlines.geojson'))
def river(names):
    out=[]
    for ft in riv['features']:
        nm=ft['properties'].get('name_en') or ft['properties'].get('name')
        if nm in names:
            g=ft['geometry']; out+= g['coordinates'] if g['type']=='MultiLineString' else [g['coordinates']]
    return out
hadrian=[[(-3.2,54.95),(-2.5,54.98),(-1.6,55.0),(-1.4,55.0)]]
antonine=[[(-4.6,55.92),(-4.2,55.96),(-3.8,56.0),(-3.55,56.02)]]
wall_region=lines_mask(prov_lines)|lines_mask(ext_rings)|lines_mask(river({'Rhine','Danube'}))|lines_mask(hadrian+antonine)
# cell-level extra walls: big rivers
big=river({'Dniester','Dnieper','Don','Volga','Vistula','Oder','Elbe','Euphrates','Tigris','Loire','Seine','Ebro','Tagus','Tajo','Po','Rhône','Tisza','Nile','Ural','Duero','Garonne'})
wall_river=lines_mask(big)
# masks
emp=np.zeros((H,W),dtype=np.uint8)
for ft in ex['features']:
    g=ft['geometry']
    for poly in (g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]): emp|=poly_mask([poly[0]])
asia=poly_mask([[(26.15,10),(26.15,40.0),(26.7,40.42),(27.0,40.6),(28.0,40.75),(28.9,40.9),(29.02,41.02),(29.12,41.2),(29.3,41.3),(29.3,43.0),(70,43),(70,10)]]).astype(bool)
ii=np.arange(H)[:,None]; jj=np.arange(W)[None,:]
lat=B1-(ii+0.5)*S; lon=L0+(jj+0.5)*S
crete=(lat<35.8)&(lon>23.4)&(lon<26.4)
cyren=(lat<34.5)&(lon>19.0)
dacia=poly_mask([[(20.3,44.9),(21.0,44.78),(22.3,44.72),(22.9,44.12),(23.9,43.85),(24.9,43.82),(25.9,43.95),(26.6,44.15),(27.5,44.3),(27.9,45.4),(27.6,48.6),(20.3,48.6)]]).astype(bool)
agri=poly_mask([[(7.65,47.56),(7.62,48.0),(7.85,48.58),(8.48,49.32),(8.42,49.64),(8.33,50.0),(7.65,50.38),(7.45,50.6),(12.5,50.6),(12.5,49.06),(12.1,49.06),(11.4,48.8),(10.8,48.76),(10.0,48.46),(10.05,47.6),(9.6,47.68),(9.0,47.75),(8.6,47.7),(8.2,47.64),(7.65,47.56)]]).astype(bool)
scot=(lat>54.97)&(lon<-1.3)&(lon>-8)
roman=land & emp.astype(bool) & ~asia & ~crete & ~cyren & ~dacia & ~agri & ~scot
np.savez_compressed('base.npz',land=land,lakes=lakes,wall_region=wall_region,wall_river=wall_river,roman=roman,emp=emp.astype(bool),asia=asia)
json.dump({'S':S,'L0':L0,'L1':L1,'B0':B0,'B1':B1,'W':W,'H':H},open('frame.json','w'))
print('roman',roman.sum(),'walls',wall_region.sum(),wall_river.sum(),file=sys.stderr)
