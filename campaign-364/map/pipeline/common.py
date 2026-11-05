import json, numpy as np, subprocess, struct, os
F=json.load(open('frame.json')); S=F['S']; L0=F['L0']; B1=F['B1']; W=F['W']; H=F['H']; N=W*H
KM=111.2*S  # km per vertical pixel
LAT=(B1-(np.arange(H)+0.5)*S).astype(np.float32)
def cell(lat,lon): return int((B1-lat)/S), int((lon-L0)/S)
def value_noise(seed, cell_deg):
    rng=np.random.default_rng(seed)
    gw=int(W*S/cell_deg)+3; gh=int(H*S/cell_deg)+3; g=rng.uniform(-1,1,(gh,gw)).astype(np.float32)
    ys=np.arange(H)*S/cell_deg; xs=np.arange(W)*S/cell_deg
    y0=np.floor(ys).astype(int); x0=np.floor(xs).astype(int)
    fy=(ys-y0).astype(np.float32)[:,None]; fx=(xs-x0).astype(np.float32)[None,:]
    fy=fy*fy*(3-2*fy); fx=fx*fx*(3-2*fx)
    a=g[y0][:,x0]; b=g[y0][:,x0+1]; c=g[y0+1][:,x0]; d=g[y0+1][:,x0+1]
    return a*(1-fy)*(1-fx)+b*(1-fy)*fx+c*fy*(1-fx)+d*fy*fx
def grow(classmask, cost, sources, tag='g'):
    """sources: list of (i,j,classbits,reach_units). returns owner (int32, index into sources or -1), dist"""
    classmask.astype(np.uint8).tofile(f'_{tag}_cm.bin'); cost.astype(np.float32).tofile(f'_{tag}_cost.bin')
    with open(f'_{tag}_src.bin','wb') as f:
        f.write(struct.pack('i',len(sources)))
        for i,j,b,r in sources: f.write(struct.pack('iif', int(i)*W+int(j), int(b), float(r)))
    subprocess.run(['./grow',str(W),str(H),str(B1),str(S),f'_{tag}_cm.bin',f'_{tag}_cost.bin',f'_{tag}_src.bin',f'_{tag}_own.bin',f'_{tag}_dist.bin'],check=True)
    own=np.fromfile(f'_{tag}_own.bin',dtype=np.int32).reshape(H,W); dist=np.fromfile(f'_{tag}_dist.bin',dtype=np.float32).reshape(H,W)
    for s in ('cm','cost','src','own','dist'): os.remove(f'_{tag}_{s}.bin')
    return own, dist
def snap(mask, i, j, rad=25):
    if 0<=i<H and 0<=j<W and mask[i,j]: return i,j
    for r in range(1,rad+1):
        i0,i1,j0,j1=max(0,i-r),min(H-1,i+r),max(0,j-r),min(W-1,j+r)
        sub=mask[i0:i1+1,j0:j1+1]; c=np.argwhere(sub)
        if len(c):
            d=(c[:,0]+i0-i)**2+(c[:,1]+j0-j)**2; b=c[d.argmin()]; return int(b[0]+i0), int(b[1]+j0)
    return None
def fill_from_neighbours(lab, todo, iters=20):
    lab=lab.copy()
    for _ in range(iters):
        if not todo.any(): break
        for di,dj in ((0,1),(0,-1),(1,0),(-1,0)):
            sh=np.roll(lab,(di,dj),axis=(0,1)); sht=np.roll(todo,(di,dj),axis=(0,1))
            m=todo & ~sht; lab[m]=sh[m]; todo=todo & ~m
    return lab, todo
def grow_lab(labels, cost, seeds, tag='l'):
    """labels int32 (-1 impassable); seeds: list of (i,j,reach_units); a seed spreads only over its own label."""
    labels.astype(np.int32).tofile(f'_{tag}_cm.bin'); cost.astype(np.float32).tofile(f'_{tag}_cost.bin')
    with open(f'_{tag}_src.bin','wb') as f:
        f.write(struct.pack('i',len(seeds)))
        for i,j,r in seeds: f.write(struct.pack('iif', int(i)*W+int(j), 0, float(r)))
    subprocess.run(['./grow2',str(W),str(H),str(B1),str(S),f'_{tag}_cm.bin',f'_{tag}_cost.bin',f'_{tag}_src.bin',f'_{tag}_own.bin',f'_{tag}_dist.bin'],check=True)
    own=np.fromfile(f'_{tag}_own.bin',dtype=np.int32).reshape(H,W); dist=np.fromfile(f'_{tag}_dist.bin',dtype=np.float32).reshape(H,W)
    for s in ('cm','cost','src','own','dist'): os.remove(f'_{tag}_{s}.bin')
    return own, dist
def snap_lab(lab, val, i, j, rad=40):
    for r in range(0,rad+1):
        i0,i1,j0,j1=max(0,i-r),min(H-1,i+r),max(0,j-r),min(W-1,j+r)
        c=np.argwhere(lab[i0:i1+1,j0:j1+1]==val)
        if len(c):
            d=(c[:,0]+i0-i)**2+(c[:,1]+j0-j)**2; b=c[d.argmin()]; return int(b[0]+i0), int(b[1]+j0)
    return None
