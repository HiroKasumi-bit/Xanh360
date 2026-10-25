"""Renders the hero's Saigon skyline still in Blender (Cycles): public/hero/saigon-3d-2400.webp and saigon-3d-1200.webp.

Chợ Bến Thành, Nhà thờ Đức Bà, Bitexco, the Ba Son bridge and Landmark 81 seen across the Saigon river on a sunny
afternoon, with a ghe ve chai and its rower in a nón lá. The layout follows the live three.js scene
(app/saigon-3d/scene.ts): the same landmarks at the same places, the same far city and trees from the same seeded
random sequence, and the same camera, so pressing "Xem 3D" swaps in a view that lines up with this picture.

Everything above the skyline is transparent (the hero's green shows through), so the sky only lights the scene and
colours reflections. Run from the repository root (about ten minutes at full size on four CPU cores):

    blender -b -P scripts/blender/saigon_still.py -- [--out public/hero] [--samples 160] [--scale 1] [--png path]

--scale 0.5 gives a quick preview; --png also writes the full-size render as a PNG for inspection.

Coordinates: Blender is z-up, so a three.js point (x, y, z) sits at (x, -z, y) here. Units are roughly tens of metres.
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def arg(name, default):
    return type(default)(ARGS[ARGS.index(name) + 1]) if name in ARGS else default


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = arg('--out', os.path.join(ROOT, 'public', 'hero'))
SAMPLES = arg('--samples', 160)
SCALE = arg('--scale', 1.0)
PNG = arg('--png', '')

WIDTH, HEIGHT = 2400, 571
EYE = Vector((40, -120, 5))
# The reference band at three.js z = -10 (Blender y = 10): x -123..163, height -12..56. Same numbers as FRAME in scene.ts.
FRAME = {'x0': -123, 'x1': 163, 'y0': -12, 'y1': 56, 'depth': 130}
SUN = Vector((120, -46, 62)).normalized()

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
collection = scene.collection


# The three.js scene's random sequence (Park–Miller, seed 81), so the far city and the trees land where they do there.
class Rand:
    seed = 81

    def __call__(self):
        Rand.seed = Rand.seed * 16807 % 2147483647
        return (Rand.seed - 1) / 2147483646


rand = Rand()


def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb(h):
    h = h.lstrip('#')
    return tuple(lin(int(h[i:i + 2], 16)) for i in (0, 2, 4)) + (1.0,)


# ---------------------------------------------------------------------------------------------------------------------
# Materials


HAZE = '#c9cfae'
HAZE_STRENGTH = 0.55


class Mat:
    """A small node-graph builder. Every surface material ends in aerial perspective: far surfaces fade into haze."""

    def __init__(self, name):
        self.mat = bpy.data.materials.new(name)
        self.mat.use_nodes = True
        self.nodes = self.mat.node_tree.nodes
        self.links = self.mat.node_tree.links
        self.nodes.clear()

    def node(self, kind, *inputs, **named):
        n = self.nodes.new(kind)
        for i, v in enumerate(inputs):
            self.set(n.inputs[i], v)
        for k, v in named.items():
            self.set(n.inputs[k.replace('_', ' ')], v)
        return n

    def set(self, socket, value):
        if isinstance(value, bpy.types.NodeSocket):
            self.links.new(value, socket)
        elif value is not None:
            socket.default_value = value

    def math(self, op, a, b=0.0, clamp=False):
        n = self.nodes.new('ShaderNodeMath')
        n.operation = op
        n.use_clamp = clamp
        self.set(n.inputs[0], a)
        self.set(n.inputs[1], b)
        return n.outputs[0]

    def mix(self, fac, a, b):
        n = self.nodes.new('ShaderNodeMix')
        n.data_type = 'RGBA'
        self.set(n.inputs[0], fac)
        self.set(n.inputs[6], a)
        self.set(n.inputs[7], b)
        return n.outputs[2]

    def mixf(self, fac, a, b):
        n = self.nodes.new('ShaderNodeMix')
        n.data_type = 'FLOAT'
        self.set(n.inputs[0], fac)
        self.set(n.inputs[2], a)
        self.set(n.inputs[3], b)
        return n.outputs[0]

    def xyz(self, vector):
        n = self.node('ShaderNodeSeparateXYZ', vector)
        return n.outputs

    def world_pos(self):
        return self.node('ShaderNodeNewGeometry').outputs['Position']

    def band(self, value, period, lo, hi):
        """1 where fract(value / period) lies in [lo, hi): window columns, floors, stone courses."""
        f = self.math('FRACT', self.math('DIVIDE', value, period))
        return self.math('MULTIPLY', self.math('GREATER_THAN', f, lo), self.math('LESS_THAN', f, hi))

    def finish(self, shader, haze=True):
        out = self.node('ShaderNodeOutputMaterial')
        if haze:
            distance = self.node('ShaderNodeCameraData').outputs['View Distance']
            fac = self.node('ShaderNodeMapRange', distance, 170.0, 560.0, 0.0, 0.6).outputs[0]
            fog = self.node('ShaderNodeEmission', rgb(HAZE), HAZE_STRENGTH).outputs[0]
            shader = self.node('ShaderNodeMixShader', fac, shader, fog).outputs[0]
        self.set(out.inputs['Surface'], shader)
        return self.mat


def principled(name, color, rough=0.6, metal=0.0, **extra):
    m = Mat(name)
    bsdf = m.node('ShaderNodeBsdfPrincipled', Base_Color=rgb(color) if isinstance(color, str) else color,
                  Roughness=rough, Metallic=metal)
    for k, v in extra.items():
        m.set(bsdf.inputs[k.replace('_', ' ')], v)
    return m.finish(bsdf.outputs[0])


def glass_curtain(name, tint, frame_tint, floor, mullion, angular=False):
    """Curtain wall: reflective glass with darker spandrel bands at each floor and thin mullions."""
    m = Mat(name)
    x, y, z = m.xyz(m.node('ShaderNodeTexCoord').outputs['Object'] if angular else m.world_pos())
    across = m.math('MULTIPLY', m.math('ARCTAN2', y, x), 24 / math.pi) if angular else m.math('ADD', x, y)
    spandrel = m.band(z, floor, 0.0, 0.05)
    frame = m.math('MAXIMUM', spandrel, m.band(across, mullion, 0.0, 0.09))
    noise = m.node('ShaderNodeTexNoise', m.node('ShaderNodeTexCoord').outputs['Object'], Scale=0.35, Detail=2.0)
    glass = m.mix(m.math('MULTIPLY', noise.outputs['Fac'], 0.5), rgb(tint), rgb('#d8e6df'))
    color = m.mix(frame, glass, rgb(frame_tint))
    bsdf = m.node('ShaderNodeBsdfPrincipled', Base_Color=color, Metallic=m.mixf(frame, 0.75, 0.4),
                  Roughness=m.mixf(frame, 0.08, 0.35))
    bsdf.inputs['Coat Weight'].default_value = 0.4
    bsdf.inputs['Coat Roughness'].default_value = 0.05
    return m.finish(bsdf.outputs[0])


def city_material():
    """Far apartments and offices: a wall colour per building, a grid of windows, balcony shadows, plain roofs."""
    m = Mat('city')
    info = m.node('ShaderNodeObjectInfo')
    ramp = m.node('ShaderNodeValToRGB', info.outputs['Random'])
    cr = ramp.color_ramp
    cr.interpolation = 'CONSTANT'
    palette = ['#efe3c4', '#d8e2dc', '#f1d59a', '#bcd3d0', '#e9c8b1', '#c9dcb8', '#f4f0e6', '#d9cbb4', '#e6b98f']
    while len(cr.elements) < len(palette):
        cr.elements.new(0.5)
    for i, c in enumerate(palette):
        cr.elements[i].position = i / len(palette)
        cr.elements[i].color = rgb(c)
    x, y, z = m.xyz(m.world_pos())
    normal = m.xyz(m.node('ShaderNodeNewGeometry').outputs['Normal'])
    side = m.math('LESS_THAN', m.math('ABSOLUTE', normal[2]), 0.5)
    across = m.math('ADD', x, y)
    # Ribbon windows, one per floor, broken by a pier every few bays: floors read at this distance, panes do not.
    windows = m.math('MULTIPLY', m.band(across, 3.1, 0.07, 0.93), m.band(z, 1.05, 0.36, 0.82))
    windows = m.math('MULTIPLY', m.math('MULTIPLY', windows, side), m.math('GREATER_THAN', z, 1.7))
    ledge = m.math('MULTIPLY', m.band(z, 1.05, 0.0, 0.12), side)
    pane = m.node('ShaderNodeTexNoise', m.world_pos(), Scale=1.6, Detail=1.0)
    glass = m.mix(pane.outputs['Fac'], rgb('#3f5753'), rgb('#9fb3ad'))
    wall = m.mix(ledge, ramp.outputs['Color'], rgb('#9a998d'))
    color = m.mix(windows, wall, glass)
    bsdf = m.node('ShaderNodeBsdfPrincipled', Base_Color=color, Roughness=m.mixf(windows, 0.85, 0.18))
    return m.finish(bsdf.outputs[0])


def brick_material():
    """Red Marseille brick laid in courses, with cream stone bands every few metres as on the cathedral."""
    m = Mat('brick')
    pos = m.world_pos()
    x, y, z = m.xyz(pos)
    brick = m.node('ShaderNodeTexBrick', m.node('ShaderNodeCombineXYZ', m.math('ADD', x, y), z, 0).outputs[0],
                   rgb('#b4573a'), rgb('#a24c32'), rgb('#c99f80'), 1.0, Mortar_Size=0.012, Bias=0.0,
                   Brick_Width=0.5, Row_Height=0.22)
    stone = m.band(z, 3.4, 0.0, 0.09)
    color = m.mix(stone, brick.outputs['Color'], rgb('#e9d9b8'))
    bsdf = m.node('ShaderNodeBsdfPrincipled', Base_Color=color, Roughness=0.86)
    return m.finish(bsdf.outputs[0])


def straw_material():
    """The nón lá: palm leaf over bamboo rings."""
    m = Mat('straw')
    rings = m.node('ShaderNodeTexWave', m.node('ShaderNodeTexCoord').outputs['Object'], Scale=9.0)
    rings.wave_type = 'RINGS'
    rings.rings_direction = 'Z'
    color = m.mix(m.math('MULTIPLY', rings.outputs['Fac'], 0.35), rgb('#efe0b0'), rgb('#b99d62'))
    bsdf = m.node('ShaderNodeBsdfPrincipled', Base_Color=color, Roughness=0.7)
    bsdf.inputs['Subsurface Weight'].default_value = 0.2
    return m.finish(bsdf.outputs[0])


def foliage_material():
    m = Mat('foliage')
    info = m.node('ShaderNodeObjectInfo')
    ramp = m.node('ShaderNodeValToRGB', info.outputs['Random'])
    ramp.color_ramp.elements[0].color = rgb('#2f5a33')
    ramp.color_ramp.elements[1].color = rgb('#5d8a45')
    noise = m.node('ShaderNodeTexNoise', m.world_pos(), Scale=1.4, Detail=4.0)
    color = m.mix(m.math('MULTIPLY', noise.outputs['Fac'], 0.6), ramp.outputs['Color'], rgb('#22421f'))
    bsdf = m.node('ShaderNodeBsdfPrincipled', Base_Color=color, Roughness=0.8)
    bsdf.inputs['Subsurface Weight'].default_value = 0.15
    bsdf.inputs['Subsurface Radius'].default_value = (0.3, 0.6, 0.2)
    return m.finish(bsdf.outputs[0])


def water_material():
    """A muddy green river rather than a mirror: a fixed share of tinted reflection over the dark water (seen this low,
    real Fresnel would turn the whole river into a copy of the pale far bank), rippled along the banks so reflections
    streak downwards."""
    m = Mat('water')
    coords = m.node('ShaderNodeTexCoord').outputs['Object']
    swell = m.node('ShaderNodeTexNoise', m.node('ShaderNodeMapping', coords, Scale=(0.04, 0.9, 1.0)).outputs[0],
                   Scale=0.8, Detail=4.0, Roughness=0.55)
    waves = m.node('ShaderNodeTexWave', m.node('ShaderNodeMapping', coords, Scale=(0.08, 1.0, 1.0)).outputs[0],
                   Scale=1.4, Distortion=9.0, Detail=4.0, Detail_Scale=2.0)
    waves.wave_type = 'BANDS'
    waves.bands_direction = 'Y'
    height = m.math('ADD', swell.outputs['Fac'], m.math('MULTIPLY', waves.outputs['Fac'], 0.35))
    normal = m.node('ShaderNodeBump', Strength=0.06, Distance=0.5, Height=height).outputs[0]
    body = m.node('ShaderNodeBsdfPrincipled', Base_Color=rgb('#0e2f2a'), Roughness=0.5, Normal=normal)
    body.inputs['Specular IOR Level'].default_value = 0.0
    mirror = m.node('ShaderNodeBsdfGlossy', rgb('#a9c2b4'), 0.04, Normal=normal)
    facing = m.node('ShaderNodeLayerWeight', 0.3).outputs['Facing']
    share = m.node('ShaderNodeMapRange', facing, 0.6, 1.0, 0.3, 0.55).outputs[0]
    return m.finish(m.node('ShaderNodeMixShader', share, body.outputs[0], mirror.outputs[0]).outputs[0], haze=False)


def haze_material():
    """The far bank glows with afternoon haze and fades into the hero's green above the skyline."""
    m = Mat('haze')
    z = m.xyz(m.node('ShaderNodeTexCoord').outputs['Generated'])[2]
    ramp = m.node('ShaderNodeValToRGB', z)
    cr = ramp.color_ramp
    cr.interpolation = 'EASE'
    stops = [(0.0, '#f5e3b2', 0.85), (0.24, '#efdeab', 0.75), (0.4, '#c9d3a4', 0.36), (0.6, '#9dbf9c', 0.12),
             (0.9, '#82ad94', 0.0)]
    while len(cr.elements) < len(stops):
        cr.elements.new(0.5)
    for el, (pos, color, alpha) in zip(cr.elements, stops):
        el.position = pos
        el.color = rgb(color)[:3] + (alpha,)
    glow = m.node('ShaderNodeEmission', ramp.outputs['Color'], 1.0)
    shader = m.node('ShaderNodeMixShader', ramp.outputs['Alpha'], m.node('ShaderNodeBsdfTransparent').outputs[0],
                    glow.outputs[0])
    m.mat.blend_method = 'BLEND'
    return m.finish(shader.outputs[0], haze=False)


MATS = {
    'cream': principled('cream', '#ead7a0', 0.85),
    'trim': principled('trim', '#f6eed6', 0.8),
    'terracotta': principled('terracotta', '#b5603f', 0.75),
    'dark': principled('dark', '#33261e', 0.95),
    'shade': principled('shade', '#5b4a3a', 0.9),
    'clock': principled('clock', '#fffaea', 0.4),
    'brick': brick_material(),
    'slate': principled('slate', '#46504e', 0.42, 0.25),
    'gold': principled('gold', '#e7c46a', 0.3, 1.0),
    'rose': principled('rose', '#5a3b33', 0.2, Emission_Color=rgb('#c9873c'), Emission_Strength=0.25),
    'l81': glass_curtain('l81 glass', '#93b6bb', '#bccdca', 0.62, 0.69),
    'bitexco': glass_curtain('bitexco glass', '#86b4aa', '#b7cdc5', 0.55, 1.0, angular=True),
    'fins': principled('fins', '#e8f1df', 0.3, 0.7),
    'pad': principled('helipad', '#5fa595', 0.45, 0.3),
    'paint': principled('helipad paint', '#f3f6ea', 0.6),
    'concrete': principled('concrete', '#e3e4da', 0.6),
    'cable': principled('cable', '#f4f6ee', 0.4, 0.6),
    'ground': principled('ground', '#5d6c5b', 0.95),
    'quay': principled('quay', '#9a9c8a', 0.9),
    'city': city_material(),
    'trunk': principled('trunk', '#5e5243', 0.95),
    'foliage': foliage_material(),
    'wood': principled('wood', '#4b3222', 0.6),
    'rim': principled('rim', '#8d6643', 0.55),
    'waterline': principled('waterline', '#2a2018', 0.8),
    'cardboard': principled('cardboard', '#bd955f', 0.9),
    'cardboard2': principled('cardboard light', '#d0ad78', 0.9),
    'bottles': principled('bottle bag', '#cfe3e6', 0.25, Transmission_Weight=0.35),
    'sack': principled('green sack', '#93b884', 0.75),
    'shirt': principled('shirt', '#4f7899', 0.8),
    'trousers': principled('trousers', '#2c3236', 0.85),
    'skin': principled('skin', '#c4946a', 0.6, Subsurface_Weight=0.3),
    'straw': straw_material(),
    'water': water_material(),
    'haze': haze_material(),
}


# ---------------------------------------------------------------------------------------------------------------------
# Geometry


def link(name, bm, mat, at=(0, 0, 0), parent=None, smooth=False):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    if smooth:
        mesh.shade_smooth()
    mesh.materials.append(MATS[mat] if isinstance(mat, str) else mat)
    obj = bpy.data.objects.new(name, mesh)
    obj.location = at
    obj.parent = parent
    collection.objects.link(obj)
    return obj


def bevel(obj, width, segments=2):
    mod = obj.modifiers.new('bevel', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    return obj


def group(name, at):
    empty = bpy.data.objects.new(name, None)
    empty.location = at
    collection.objects.link(empty)
    return empty


def box(name, size, at, mat, parent=None, round_=0.0, rot_z=0.0):
    """A box size (x, y, z) centred at `at`."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    obj = link(name, bm, mat, at, parent)
    obj.rotation_euler.z = rot_z
    return bevel(obj, round_) if round_ else obj


def cone(name, r1, r2, depth, at, mat, parent=None, segments=4, rot_z=0.0, cap=True, smooth=False):
    """A cone or frustum standing on the z axis, centred at `at` (like three.js ConeGeometry)."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, segments=segments, radius1=r1, radius2=r2, depth=depth)
    obj = link(name, bm, mat, at, parent, smooth)
    obj.rotation_euler.z = rot_z
    return obj


def sphere(name, radius, at, mat, parent=None, subdiv=3, scale=(1, 1, 1)):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=radius)
    bmesh.ops.scale(bm, vec=scale, verts=bm.verts)
    return link(name, bm, mat, at, parent, smooth=True)


def prism(name, width, height, depth, at, mat, parent=None):
    """A triangular roof: base `width` along x, ridge `height` above its base, `depth` along y. `at` is the base centre."""
    bm = bmesh.new()
    verts = [bm.verts.new((sx * width / 2 if sx else 0, sy * depth / 2, height if sx == 0 else 0))
             for sy in (-1, 1) for sx in (-1, 1, 0)]
    a0, b0, c0, a1, b1, c1 = verts
    for face in ((a0, b0, c0), (a1, c1, b1), (a0, a1, b1, b0), (b0, b1, c1, c0), (c0, c1, a1, a0)):
        bm.faces.new(face)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return link(name, bm, mat, at, parent)


def hip_roof(name, w, d, h, at, mat, parent=None, ridge=0.0):
    """A hipped roof over a w × d plan, `ridge` long along x, `at` the base centre."""
    bm = bmesh.new()
    base = [bm.verts.new((sx * w / 2, sy * d / 2, 0)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    if ridge:
        left, right = bm.verts.new((-ridge / 2, 0, h)), bm.verts.new((ridge / 2, 0, h))
        bm.faces.new((base[0], base[1], right, left))
        bm.faces.new((base[1], base[2], right))
        bm.faces.new((base[2], base[3], left, right))
        bm.faces.new((base[3], base[0], left))
    else:
        apex = bm.verts.new((0, 0, h))
        for k in range(4):
            bm.faces.new((base[k], base[(k + 1) % 4], apex))
    bm.faces.new(list(reversed(base)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return link(name, bm, mat, at, parent)


def arch(name, width, height, depth, at, mat, parent=None, pointed=False):
    """An arched opening on a facade facing the camera (−y): a rounded or pointed arch extruded by `depth`."""
    r = width / 2
    bm = bmesh.new()
    pts = [(-r, 0), (r, 0)]
    spring = height - (width * math.sin(math.pi / 3) if pointed else r)
    steps = 10
    if pointed:
        # Equilateral (lancet) arch: each half is an arc centred on the opposite springing point.
        for i in range(steps + 1):
            a = math.pi / 3 * i / steps
            pts.append((-r + width * math.cos(a), spring + width * math.sin(a)))
        for i in range(1, steps + 1):
            a = 2 * math.pi / 3 + math.pi / 3 * i / steps
            pts.append((r + width * math.cos(a), spring + width * math.sin(a)))
    else:
        for i in range(steps + 1):
            a = math.pi * i / steps
            pts.append((r * math.cos(a), spring + r * math.sin(a)))
    verts = [bm.verts.new((x, 0, z)) for x, z in pts]
    face = bm.faces.new(verts)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    bmesh.ops.translate(bm, vec=(0, depth, 0), verts=[v for v in ext['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return link(name, bm, mat, at, parent)


def disc(name, radius, at, mat, parent=None, depth=0.08, segments=40):
    """A thin disc facing the camera."""
    obj = cone(name, radius, radius, depth, at, mat, parent, segments=segments)
    obj.rotation_euler.x = math.pi / 2
    return obj


def tube(name, points, radius, mat, parent=None):
    """A round bar along a polyline (stays, oars)."""
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for p, co in zip(spline.points, points):
        p.co = (*co, 1)
    curve.materials.append(MATS[mat])
    obj = bpy.data.objects.new(name, curve)
    obj.parent = parent
    collection.objects.link(obj)
    return obj


def visibility(obj, camera=True, diffuse=True, glossy=True, shadow=True, transmission=True):
    obj.visible_camera = camera
    obj.visible_diffuse = diffuse
    obj.visible_glossy = glossy
    obj.visible_shadow = shadow
    obj.visible_transmission = transmission


# ---------------------------------------------------------------------------------------------------------------------
# The city

# Haze backdrop far behind the city: it shows above the skyline only. It lights nothing and nothing reflects it, so the
# river and the glass reflect the sky gradient below instead.
haze = box('haze', (4000, 0.1, 140), (40, 280, 40), 'haze')
visibility(haze, diffuse=False, glossy=False, shadow=False, transmission=False)

# Ground: two quays with the inlet the Ba Son bridge crosses between them.
for x0, x1 in ((-800, 60), (80, 900)):
    box('quay', (x1 - x0, 300, 1.2), ((x0 + x1) / 2, 150, 0), 'ground')
    box('quay edge', (x1 - x0, 0.6, 1.3), ((x0 + x1) / 2, 0.1, 0), 'quay')
box('inlet back', (20, 270, 1.2), (70, 165, 0), 'ground')

# Far city: the same blocks as the live scene (scene.ts), low on the left under the copy, taller behind the towers.
for i in range(300):
    x = -420 + rand() * 820
    z = -18 - rand() * 120
    if 58 < x < 82 and z > -40:
        continue
    right = min(1, max(0, (x + 20) / 140))
    depth = (-z - 18) / 120
    near = 0.45 if any(abs(x - lx) < 9 for lx in (8, 26, 46, 102)) else 1
    if -140 < x < -4:
        h = 1.5 + rand() * (1.5 + depth * 2)
    else:
        a = rand()
        b = rand()
        h = (2 + a * (4 + right * 14 + depth * 10) + (right * 14 if b > 0.9 else 0)) * near
    w = 4 + rand() * 7
    d = 4 + rand() * 7
    rand()  # the live scene picks its tint here; this one uses the object's own random value
    block = box('block', (w, d, h), (x, -z, h / 2 + 0.6), 'city', round_=0.22)
    # Rooftop clutter on taller blocks: a water tank or a stair house, as on Saigon apartment roofs.
    if h > 6 and (i % 3 == 0):
        box('roof box', (min(w, 2.4), min(d, 2.0), 1.1), (x + w * 0.18, -z + d * 0.1, h + 0.6 + 0.55), 'quay', round_=0.1)

# Cây dầu along the river: tall bare trunks, crowns high up.
spots = []
x = -400.0
while x < 360:
    if not (-140 < x < 34 or 40 < x < 54 or 92 < x < 110):
        spots.append(x)
    x += 9 + rand() * 14
for x in spots:
    h = 3.5 + rand() * 3.5
    z = -2.5 - rand() * 3
    tree = group('cay dau', (x, -z, 0.6))
    cone('trunk', 0.32, 0.2, h + 1, (0, 0, (h + 1) / 2), 'trunk', tree, segments=8, smooth=True)
    for k in range(5):
        r = 1.4 + rand() * 1.2
        a = k / 5 * math.pi * 2 + rand()
        dx = 0 if k == 4 else math.cos(a) * 1.4
        dz = 0 if k == 4 else math.sin(a) * 1.1
        dy = 1.3 if k == 4 else rand() * 0.6 - 0.4
        rand()
        rand()
        crown = sphere('crown', r * 1.1, (dx * 1.2, -dz, h + 0.8 + dy), 'foliage', tree, subdiv=3, scale=(1.25, 1.1, 0.68))
        mod = crown.modifiers.new('leaves', 'DISPLACE')
        tex = bpy.data.textures.new('leaves', 'CLOUDS')
        tex.noise_scale = 0.45
        tex.noise_depth = 3
        mod.texture = tex
        mod.strength = 0.7
        mod.texture_coords = 'GLOBAL'

# Chợ Bến Thành: the long cream hall under terracotta, the entrance pavilion and the clock tower with its hipped cap.
market = group('cho ben thanh', (8, 9, 0))
box('hall', (24, 10, 6), (0, 0, 3.6), 'cream', market, 0.06)
hip_roof('hall roof', 25, 11, 1.8, (0, 0, 6.6), 'terracotta', market, ridge=14)
box('pavilion', (8, 9, 9), (0, -1.2, 5.1), 'cream', market, 0.06)
box('pavilion cornice', (8.6, 9.6, 0.5), (0, -1.2, 9.8), 'trim', market, 0.05)
for sx in (-1, 1):
    box('pilaster', (0.7, 0.4, 9), (sx * 3.6, -5.75, 5.1), 'trim', market, 0.04)
box('tower', (4.2, 4.2, 7), (0, -2.2, 12.6), 'trim', market, 0.05)
box('tower band', (4.6, 4.6, 0.35), (0, -2.2, 15.9), 'cream', market, 0.04)
hip_roof('tower cap', 6.2, 6.2, 2.6, (0, -2.2, 16.1), 'terracotta', market)
cone('finial', 0.08, 0.02, 2.4, (0, -2.2, 19.6), 'dark', market, segments=6)
disc('clock face', 1.25, (0, -4.36, 13.2), 'clock', market)
disc('clock ring', 1.4, (0, -4.32, 13.2), 'dark', market, depth=0.05)
box('hand long', (0.14, 0.05, 0.95), (0, -4.42, 13.62), 'dark', market)
box('hand short', (0.7, 0.05, 0.12), (0.3, -4.42, 13.2), 'dark', market)
arch('door', 3, 4.6, 0.3, (0, -5.85, 0.6), 'dark', market)
for x in (-9, -5.5, 5.5, 9):
    arch('arcade', 2, 3.4, 0.3, (x, -5.15, 1.4), 'dark', market)
    box('window', (1.3, 0.2, 0.8), (x, -5.05, 5.6), 'shade', market)

# Nhà thờ Đức Bà: twin brick towers under slate spires, the gabled facade with its rose window and three portals.
cathedral = group('nha tho duc ba', (26, 10, 0))
# The nave starts behind the facade: coincident faces would block each other's light.
box('nave', (8, 15, 10), (0, 6.5, 5.6), 'brick', cathedral)
prism('nave roof', 8.6, 3.6, 15, (0, 6.5, 10.6), 'slate', cathedral)
box('facade', (6, 2, 11), (0, -1.05, 6.1), 'brick', cathedral)
prism('gable', 6, 3.4, 2, (0, -1.05, 11.6), 'brick', cathedral)
disc('rose window', 1.2, (0, -2.1, 8.4), 'rose', cathedral)
disc('rose frame', 1.5, (0, -2.07, 8.4), 'trim', cathedral, depth=0.05)
arch('portal', 2.4, 4.0, 0.3, (0, -2.15, 0.6), 'dark', cathedral)
cone('gable cross', 0.1, 0.1, 1.2, (0, -1, 15.6), 'gold', cathedral, segments=6)
for x in (-4.6, 4.6):
    box('tower', (3.6, 3.6, 16), (x, -0.8, 8.6), 'brick', cathedral)
    box('belfry ledge', (4.0, 4.0, 0.35), (x, -0.8, 16.6), 'trim', cathedral)
    cone('spire', 2.2, 0.0, 9, (x, -0.8, 21.1), 'slate', cathedral, segments=8, rot_z=math.pi / 8)
    for px, py in ((-1.5, -1.5), (1.5, -1.5), (-1.5, 1.5), (1.5, 1.5)):
        cone('pinnacle', 0.32, 0.0, 2.2, (x + px, -0.8 + py, 17.9), 'slate', cathedral, segments=6)
    box('cross post', (0.22, 0.22, 1.9), (x, -0.8, 26.6), 'gold', cathedral)
    box('cross arm', (1.1, 0.22, 0.22), (x, -0.8, 26.95), 'gold', cathedral)
    arch('belfry', 1.0, 2.6, 0.3, (x, -2.75, 12.6), 'dark', cathedral, pointed=True)
    arch('lancet', 0.8, 2.0, 0.3, (x, -2.75, 7.4), 'dark', cathedral, pointed=True)
    arch('side portal', 1.6, 3.0, 0.3, (x, -2.75, 0.6), 'dark', cathedral)

# Bitexco Financial Tower: the lotus bud on an elliptical plan, the helipad cantilevered from its west face.
profile = [(4.7, 0), (5.1, 9), (4.9, 17), (4.2, 23), (3.1, 28), (1.8, 31.5), (0.6, 33.6), (0.01, 34.4)]
bm = bmesh.new()
rings = []
for r, y in profile:
    rings.append([bm.verts.new((r * math.cos(t), r * math.sin(t) * 0.68, y))
                  for t in (2 * math.pi * k / 64 for k in range(64))])
for lo, hi in zip(rings, rings[1:]):
    for k in range(64):
        bm.faces.new((lo[k], lo[(k + 1) % 64], hi[(k + 1) % 64], hi[k]))
bm.faces.new(list(reversed(rings[0])))
bitexco = group('bitexco', (46, 16, 0.6))
body = link('bitexco body', bm, 'bitexco', parent=bitexco, smooth=True)
sub = body.modifiers.new('smooth', 'SUBSURF')
sub.levels = sub.render_levels = 1
cone('helipad', 3.2, 3.2, 0.5, (-6.7, 0, 22.6), 'pad', bitexco, segments=48)
cone('helipad mark', 2.2, 2.2, 0.06, (-6.7, 0, 22.88), 'paint', bitexco, segments=48)
cone('helipad hole', 1.6, 1.6, 0.08, (-6.7, 0, 22.89), 'pad', bitexco, segments=48)
strut = box('helipad strut', (5.2, 0.7, 0.45), (-6.2, 0, 20.8), 'pad', bitexco, 0.08)
strut.rotation_euler.y = 0.6

# Landmark 81: nine glass shafts stepping up to the central one, a podium, and a crown of fins around the mast.
l81 = group('landmark 81', (102, 20, 0.6))
heights = [[30, 40, 34], [43, 48, 45], [33, 41, 27]]
w = 2.75
for i in range(3):
    for k in range(3):
        h = heights[i][k]
        box('shaft', (w, w, h), ((i - 1) * w, -(k - 1) * w, h / 2), 'l81', l81, 0.06)
        box('shaft top', (w * 0.92, w * 0.92, 0.5), ((i - 1) * w, -(k - 1) * w, h + 0.25), 'fins', l81, 0.05)
box('podium', (14, 12, 3.2), (0, 0, 1.6), 'l81', l81, 0.1)
for i in range(16):
    a = i / 16 * math.pi * 2
    h = 3.5 + (i * 5 % 7) * 0.7
    box('fin', (0.18, 0.18, h), (math.cos(a) * 1.05, math.sin(a) * 1.05, 48 + h / 2), 'fins', l81)
cone('mast', 0.16, 0.06, 10, (0, 0, 53), 'fins', l81, segments=8)

# Ba Son bridge: a raised deck over the inlet and one white pylon, curving back from the main span like a blade, the
# stays fanning from its upper half across the main span and a shorter back fan behind it.
bridge = group('cau ba son', (0, 0, 0))
box('deck', (46, 3.4, 0.9), (69, 6, 4.2), 'concrete', bridge, 0.1)
box('railing', (46, 0.12, 0.35), (69, 4.35, 4.85), 'concrete', bridge)
for x in (55, 85):
    box('pier', (1.2, 2.4, 4), (x, 6, 2), 'concrete', bridge, 0.1)
blade = [Vector((76 + 8 * t ** 1.7, 6, 0.6 + 25.5 * t)) for t in (i / 24 for i in range(25))]
bm = bmesh.new()
rows = []
for i, p in enumerate(blade):
    t = i / 24
    half_w = 0.95 * (1 - t) + 0.1 * t
    half_d = 1.0 * (1 - t) + 0.14 * t
    rows.append([bm.verts.new(p + Vector(o)) for o in ((-half_w, -half_d, 0), (half_w, -half_d, 0),
                                                         (half_w, half_d, 0), (-half_w, half_d, 0))])
for lo, hi in zip(rows, rows[1:]):
    for k in range(4):
        bm.faces.new((lo[k], lo[(k + 1) % 4], hi[(k + 1) % 4], hi[k]))
bm.faces.new(list(reversed(rows[0])))
bm.faces.new(rows[-1])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
link('pylon', bm, 'concrete', parent=bridge, smooth=True)
anchors = [blade[i] for i in range(9, 24, 2)]
for top, x in zip(anchors, (71, 68, 65, 62, 59, 56, 53, 50)):
    for y in (4.6, 7.4):
        tube('stay', [top + Vector((0, y - 6, 0)), (x, y, 4.7)], 0.07, 'cable', bridge)
for top, x in zip(anchors[1::2], (82, 85, 88, 91)):
    for y in (4.6, 7.4):
        tube('back stay', [top + Vector((0, y - 6, 0)), (x, y, 4.7)], 0.07, 'cable', bridge)

# The ghe ve chai: a wooden sampan with upturned ends carrying the day's sorted haul, rowed by a woman in a nón lá.
boat = group('ghe ve chai', (42, -58, 0.25))
boat.scale = (1.25, 1.25, 1.25)
boat.rotation_euler.z = 0.08


def quad(p0, c, p1, steps=10):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]) for t in (i / steps for i in range(steps))]


outline = (quad((-4.2, 1.5), (-3.6, 0.2), (-2.4, 0)) + quad((2.4, 0), (3.6, 0.2), (4.2, 1.5))
           + quad((4.2, 1.5), (0, 0.85), (-4.2, 1.5)))
bm = bmesh.new()
face = bm.faces.new([bm.verts.new((x, -0.85, z - 0.55)) for x, z in outline])
ext = bmesh.ops.extrude_face_region(bm, geom=[face])
bmesh.ops.translate(bm, vec=(0, 1.7, 0), verts=[v for v in ext['geom'] if isinstance(v, bmesh.types.BMVert)])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
hull = link('hull', bm, 'wood', parent=boat)
bevel(hull, 0.18, 3)
box('rim', (6.2, 1.95, 0.12), (0, 0, 0.4), 'rim', boat, 0.04)
box('waterline', (5.2, 1.86, 0.18), (0, 0, -0.42), 'waterline', boat, 0.06)
for size, mat, at, r in (((1.5, 1.3, 0.9), 'cardboard', (-2.2, 0, 0.85), 0.08),
                         ((1.4, 1.2, 0.6), 'cardboard2', (-2.2, -0.05, 1.6), 0.06),
                         ((1.5, 1.35, 1.45), 'bottles', (-0.55, 0, 1.05), 0.5),
                         ((1.3, 1.2, 1.05), 'sack', (0.85, -0.05, 0.85), 0.42)):
    bevel(box('bale', size, at, mat, boat), r, 4).modifiers.new('soft', 'SUBSURF').levels = 1
box('twine', (1.52, 1.32, 0.08), (-2.2, 0, 0.95), 'rim', boat)
sphere('body', 0.45, (2.6, 0, 1.55), 'shirt', boat, scale=(0.95, 0.85, 1.75)).rotation_euler.y = -0.12
sphere('legs', 0.36, (2.65, 0, 0.75), 'trousers', boat, scale=(1, 1, 1.4))
sphere('head', 0.36, (2.5, 0, 2.75), 'skin', boat)
hat = cone('non la', 1.05, 0.0, 0.62, (2.5, 0, 3.25), 'straw', boat, segments=48, cap=False, smooth=True)
hat.modifiers.new('thickness', 'SOLIDIFY').thickness = 0.03
tube('arm', [(2.75, -0.3, 2.2), (3.2, -0.35, 1.85), (3.55, -0.35, 1.75)], 0.13, 'shirt', boat)
tube('oar', [(3.1, -0.4, 2.55), (5.05, -0.4, -0.95)], 0.07, 'wood', boat)
box('oar blade', (0.5, 0.08, 1.2), (4.95, -0.4, -0.75), 'wood', boat, 0.03).rotation_euler.y = -0.51

# The Saigon river.
water = box('song sai gon', (2400, 300, 0.05), (40, -140, -0.03), 'water')

# ---------------------------------------------------------------------------------------------------------------------
# Light, sky, camera

world = bpy.data.worlds.new('sky')
scene.world = world
world.use_nodes = True
wn = world.node_tree.nodes
wl = world.node_tree.links
wn.clear()
sky = wn.new('ShaderNodeTexSky')
sky.sky_type = 'NISHITA'
sky.sun_disc = False
sky.sun_elevation = math.asin(SUN.z)
sky.sun_rotation = math.atan2(SUN.x, -SUN.y)
sky.air_density = 1.4
sky.dust_density = 2.5
lit = wn.new('ShaderNodeBackground')
lit.inputs['Strength'].default_value = 0.16
wl.new(sky.outputs[0], lit.inputs['Color'])
# What reflections see: warm haze at the horizon rising into the hero's own greens, the water's dark below.
direction = wn.new('ShaderNodeTexCoord')
sep = wn.new('ShaderNodeSeparateXYZ')
wl.new(direction.outputs['Generated'], sep.inputs[0])
ramp = wn.new('ShaderNodeValToRGB')
wl.new(sep.outputs[2], ramp.inputs[0])
stops = [(0.0, '#173b30'), (0.47, '#4b6f5d'), (0.5, '#e2d9aa'), (0.512, '#a9bf9c'), (0.535, '#4f7a62'),
         (0.75, '#2c5d48'), (1.0, '#24503e')]
cr = ramp.color_ramp
while len(cr.elements) < len(stops):
    cr.elements.new(0.5)
for el, (pos, color) in zip(cr.elements, stops):
    el.position = pos
    el.color = rgb(color)
mapping = wn.new('ShaderNodeMapRange')
mapping.inputs['From Min'].default_value = -1
mapping.inputs['From Max'].default_value = 1
wl.new(sep.outputs[2], mapping.inputs['Value'])
wl.new(mapping.outputs[0], ramp.inputs[0])
seen = wn.new('ShaderNodeBackground')
seen.inputs['Strength'].default_value = 1.0
wl.new(ramp.outputs[0], seen.inputs['Color'])
path = wn.new('ShaderNodeLightPath')
pick = wn.new('ShaderNodeMixShader')
wl.new(path.outputs['Is Glossy Ray'], pick.inputs[0])
wl.new(lit.outputs[0], pick.inputs[1])
wl.new(seen.outputs[0], pick.inputs[2])
out = wn.new('ShaderNodeOutputWorld')
wl.new(pick.outputs[0], out.inputs['Surface'])

sun_data = bpy.data.lights.new('sun', 'SUN')
sun_data.energy = 5.0
sun_data.angle = math.radians(2.5)
sun_data.color = (1.0, 0.86, 0.68)
sun = bpy.data.objects.new('sun', sun_data)
sun.rotation_euler = (-SUN).to_track_quat('-Z', 'Y').to_euler()
collection.objects.link(sun)

cam_data = bpy.data.cameras.new('camera')
cam_data.sensor_fit = 'HORIZONTAL'
cam_data.sensor_width = 36
width = FRAME['x1'] - FRAME['x0']
cam_data.lens = 36 * FRAME['depth'] / width
cam_data.shift_x = ((FRAME['x0'] + FRAME['x1']) / 2 - EYE.x) / width
cam_data.shift_y = ((FRAME['y0'] + FRAME['y1']) / 2 - EYE.z) / width
cam_data.clip_start = 1
cam_data.clip_end = 1500
camera = bpy.data.objects.new('camera', cam_data)
camera.location = EYE
camera.rotation_euler = (math.pi / 2, 0, 0)
collection.objects.link(camera)
scene.camera = camera

render = scene.render
render.engine = 'CYCLES'
render.resolution_x = round(WIDTH * SCALE)
render.resolution_y = round(HEIGHT * SCALE)
render.resolution_percentage = 100
render.film_transparent = True
render.filter_size = 1.2
cycles = scene.cycles
cycles.device = 'CPU'
cycles.samples = SAMPLES
cycles.use_adaptive_sampling = True
cycles.adaptive_threshold = 0.02
cycles.use_denoising = True
cycles.denoiser = 'OPENIMAGEDENOISE'
cycles.max_bounces = 6
cycles.diffuse_bounces = 3
cycles.glossy_bounces = 3
cycles.transmission_bounces = 4
cycles.transparent_max_bounces = 8
cycles.caustics_reflective = False
cycles.caustics_refractive = False
cycles.blur_glossy = 0.5
scene.view_settings.view_transform = 'AgX'
try:
    scene.view_settings.look = 'AgX - Medium High Contrast'
except TypeError:
    print('looks:', [l.identifier for l in scene.view_settings.bl_rna.properties['look'].enum_items])
scene.view_settings.exposure = 0.15

image = render.image_settings
image.color_mode = 'RGBA'
os.makedirs(OUT, exist_ok=True)
if PNG:
    image.file_format = 'PNG'
    render.filepath = PNG
    bpy.ops.render.render(write_still=True)
    shot = bpy.data.images.load(PNG)
else:
    bpy.ops.render.render()
    shot = bpy.data.images['Render Result']
    tmp = os.path.join(OUT, '.saigon-render.png')
    image.file_format = 'PNG'
    shot.save_render(tmp)
    shot = bpy.data.images.load(tmp)

# Web copies: the full render and a half-size one for phones, WebP with alpha.
for size in (2400, 1200):
    copy = shot.copy()
    copy.scale(round(size * SCALE), round(size * SCALE * HEIGHT / WIDTH))
    copy.file_format = 'WEBP'
    name = f'saigon-3d-{size}.webp' if SCALE == 1 else f'preview-{size}.webp'
    copy.save(filepath=os.path.join(OUT, name), quality=86)
    print('wrote', name, copy.size[:])
if not PNG:
    os.remove(os.path.join(OUT, '.saigon-render.png'))
