"""Renders the hero's photographs of Saigon in Blender (Cycles), one per time of day, each in a wide frame for laptops and
tablets and a tall one for phones and portrait tablets: public/hero/saigon-{dawn,day,sunset,night}-{wide-2560,wide-1280,
tall-1600,tall-1200,tall-800}.webp.

A ghe ve chai, its rower standing at the stern in a nón lá, crosses the Saigon river; behind it, Chợ Bến Thành, Nhà thờ
Đức Bà, Bitexco, the Ba Son bridge and Landmark 81 rise over the far bank. The camera sits low over the water, so the
skyline and the sky carry the frame and the river doubles them. The page picks the picture for the hour in Ho Chi Minh
City (app/daypart.ts):

- dawn: a low sun rises left of the skyline, mist lies on the water, pastel sky;
- day: high sun, cumulus over a clear blue sky;
- sunset: the sun sets behind the towers, backlit skyline, gold on the river;
- night: the city, the bridge and the quay lamps lit under a deep blue sky.

Made with Blender 4.2 LTS; run from the repository root (about half an hour for all eight on four CPU cores):

    blender -b -P scripts/blender/saigon_hero.py -- [--part dawn|day|sunset|night|all] [--frame wide|tall|all]
                                                    [--out public/hero] [--samples 128] [--scale 1]

--scale 0.25 gives quick previews (written as preview-*.webp). Units are roughly tens of metres; the small landmarks
are drawn larger than life so they read next to the towers.
"""
import math
import os
import sys
import urllib.request

import bmesh
import bpy
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def arg(name, default):
    return type(default)(ARGS[ARGS.index(name) + 1]) if name in ARGS else default


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = arg('--out', os.path.join(ROOT, 'public', 'hero'))
SAMPLES = arg('--samples', 128)
SCALE = arg('--scale', 1.0)
# Photo textures from Poly Haven (CC0, polyhaven.com), downloaded once at 1k into this git-ignored folder.
CACHE = os.path.join(ROOT, 'scripts', 'blender', '.cache')
# Each texture's mean linear brightness, so a photo factor of 1 leaves a colour as chosen.
PHOTO_MEAN = {'dirty_concrete': 0.232, 'concrete_layers_02': 0.197}
PARTS = ['dawn', 'day', 'sunset', 'night'] if arg('--part', 'all') == 'all' else [arg('--part', 'all')]
FRAMES = ['wide', 'tall'] if arg('--frame', 'all') == 'all' else [arg('--frame', 'all')]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
collection = scene.collection


def polyhaven(asset, kind):
    """A 1k map (diff, rough, nor_gl…) of a Poly Haven texture, fetched on first use."""
    path = os.path.join(CACHE, f'{asset}_{kind}_1k.jpg')
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        urllib.request.urlretrieve(f'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/{asset}/{asset}_{kind}_1k.jpg', path)
    return path


# A fixed random sequence (Park–Miller, seed 81), so every run builds the same city.
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


def direction(azimuth, elevation):
    """A direction from degrees: azimuth 0 looks straight ahead (+y), positive turns right (+x)."""
    a, e = math.radians(azimuth), math.radians(elevation)
    return Vector((math.cos(e) * math.sin(a), math.cos(e) * math.cos(a), math.sin(e)))


# ---------------------------------------------------------------------------------------------------------------------
# Materials. Values that change with the time of day (haze colour, lights coming on) are node sockets kept in TUNE and
# set per time of day before each render.

TUNE = {'haze': [], 'haze_strength': [], 'lights': [], 'cloud': []}


class Mat:
    """A small node-graph builder. Surface materials end in aerial perspective: far surfaces fade into the haze."""

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
        return self.node('ShaderNodeSeparateXYZ', vector).outputs

    def world_pos(self):
        return self.node('ShaderNodeNewGeometry').outputs['Position']

    def band(self, value, period, lo, hi):
        """1 where fract(value / period) lies in [lo, hi): window columns, floors, stone courses."""
        f = self.math('FRACT', self.math('DIVIDE', value, period))
        return self.math('MULTIPLY', self.math('GREATER_THAN', f, lo), self.math('LESS_THAN', f, hi))

    def cell(self, value, period):
        return self.math('FLOOR', self.math('DIVIDE', value, period))

    def times(self, color, factor):
        """A colour scaled by a float socket or value."""
        n = self.nodes.new('ShaderNodeMix')
        n.data_type = 'RGBA'
        n.blend_type = 'MULTIPLY'
        n.inputs[0].default_value = 1.0
        self.set(n.inputs[6], color)
        self.set(n.inputs[7], factor if isinstance(factor, bpy.types.NodeSocket) else (factor,) * 3 + (1.0,))
        return n.outputs[2]

    def photo(self, asset, tile):
        """The brightness of a Poly Haven photo texture laid over every face (box projection in world space), one tile
        every `tile` units; 1 is its average."""
        tex = self.nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(polyhaven(asset, 'diff'), check_existing=True)
        tex.projection = 'BOX'
        tex.projection_blend = 0.3
        self.set(tex.inputs['Vector'], self.node('ShaderNodeMapping', self.world_pos(), Scale=(1 / tile,) * 3).outputs[0])
        grey = self.node('ShaderNodeRGBToBW', tex.outputs['Color']).outputs[0]
        return self.math('DIVIDE', grey, PHOTO_MEAN.get(asset, 0.5))

    def glow(self, color, night_strength, mask=None):
        """An emission that comes on with the city lights (TUNE['lights'] scales it per time of day), only where `mask`
        is 1. It is added to the surface, so where it is dark it must be black, not transparent."""
        e = self.node('ShaderNodeEmission', color if mask is None else self.mix(mask, (0, 0, 0, 1), color), 0.0)
        TUNE['lights'].append((e.inputs['Strength'], night_strength))
        return e.outputs[0], e

    def finish(self, shader, haze=True, lights=None):
        out = self.node('ShaderNodeOutputMaterial')
        if lights is not None:
            shader = self.node('ShaderNodeAddShader', shader, lights).outputs[0]
        if haze:
            distance = self.node('ShaderNodeCameraData').outputs['View Distance']
            fac = self.node('ShaderNodeMapRange', distance, 140.0, 900.0, 0.0, 0.85).outputs[0]
            fog = self.node('ShaderNodeEmission', (1, 1, 1, 1), 1.0)
            TUNE['haze'].append(fog.inputs['Color'])
            TUNE['haze_strength'].append(fog.inputs['Strength'])
            shader = self.node('ShaderNodeMixShader', fac, shader, fog.outputs[0]).outputs[0]
        self.set(out.inputs['Surface'], shader)
        return self.mat


def principled(name, color, rough=0.6, metal=0.0, night=None, **extra):
    """A plain surface; `night` = (colour, strength) makes it glow once the lights come on."""
    m = Mat(name)
    bsdf = m.node('ShaderNodeBsdfPrincipled', Base_Color=rgb(color) if isinstance(color, str) else color,
                  Roughness=rough, Metallic=metal)
    for k, v in extra.items():
        m.set(bsdf.inputs[k.replace('_', ' ')], v)
    lights = m.glow(rgb(night[0]), night[1])[0] if night else None
    return m.finish(bsdf.outputs[0], lights=lights)


def glass_curtain(name, tint, frame_tint, floor, mullion, angular=False, night=('#cfe7ff', 0.0), lit_share=0.0):
    """Curtain wall at its real grain (a storey of about 4 m, a mullion every metre and a half or two): reflective glass
    with spandrel bands at each floor and thin mullions. At night a share of the bays is lit (`lit_share`), each at its
    own brightness, warm or cool; the mullions can carry a line of light (`night`)."""
    m = Mat(name)
    x, y, z = m.xyz(m.node('ShaderNodeTexCoord').outputs['Object'] if angular else m.world_pos())
    across = m.math('MULTIPLY', m.math('ARCTAN2', y, x), 24 / math.pi) if angular else m.math('ADD', x, y)
    spandrel = m.band(z, floor, 0.0, 0.18)
    mull = m.band(across, mullion, 0.0, 0.12)
    frame = m.math('MAXIMUM', spandrel, mull)
    noise = m.node('ShaderNodeTexNoise', m.node('ShaderNodeTexCoord').outputs['Object'], Scale=0.35, Detail=2.0)
    glass = m.mix(m.math('MULTIPLY', noise.outputs['Fac'], 0.5), rgb(tint), rgb('#d8e6df'))
    color = m.mix(frame, glass, rgb(frame_tint))
    bsdf = m.node('ShaderNodeBsdfPrincipled', Base_Color=color, Metallic=m.mixf(frame, 0.6, 0.3),
                  Roughness=m.mixf(frame, 0.12, 0.4))
    # Lit offices: bay by storey, each with its own level and tone; whole floors come on together now and then.
    cells = m.node('ShaderNodeCombineXYZ', m.cell(across, mullion), m.cell(z, floor), 0).outputs[0]
    dice = m.xyz(m.node('ShaderNodeTexWhiteNoise', cells).outputs['Color'])
    floor_dice = m.node('ShaderNodeTexWhiteNoise', m.node('ShaderNodeCombineXYZ', 0, m.cell(z, floor), 3).outputs[0])
    on = m.math('MAXIMUM', m.math('LESS_THAN', dice[0], lit_share),
                m.math('LESS_THAN', floor_dice.outputs['Value'], lit_share * 0.25))
    level = m.math('ADD', 0.5, m.math('MULTIPLY', dice[1], 0.5))
    offices = m.math('MULTIPLY', m.math('MULTIPLY', on, level), m.math('SUBTRACT', 1.0, frame))
    tone = m.mix(m.math('GREATER_THAN', dice[2], 0.75), rgb('#ffd9a8'), rgb('#f6f2ea'))
    room, _ = m.glow(tone, 2.4, offices)
    line, _ = m.glow(rgb(night[0]), night[1], mull)
    lights = m.node('ShaderNodeAddShader', room, line)
    return m.finish(bsdf.outputs[0], lights=lights.outputs[0])


def city_material():
    """Far apartments and offices at their real grain (a unit is about 7.5 m: storeys of 3.3–3.8 m, bays of 2.3–3.6 m):
    a wall colour per building over stained concrete (Poly Haven) with rain streaks, a ledge at each floor, windows set
    into each bay. At night a share of the windows is lit, each with its own brightness and colour temperature (warm
    bulbs, white and cool LEDs, the odd blue of a television), some dimmed by curtains; offices light whole floors."""
    m = Mat('city')
    info = m.node('ShaderNodeObjectInfo')
    rnd = info.outputs['Random']
    ramp = m.node('ShaderNodeValToRGB', rnd)
    cr = ramp.color_ramp
    cr.interpolation = 'CONSTANT'
    palette = ['#d9cdb0', '#c4cec8', '#dcc28c', '#a9bfbc', '#d4b59f', '#b6c8a6', '#ddd9cf', '#c4b7a1', '#cfa682']
    while len(cr.elements) < len(palette):
        cr.elements.new(0.5)
    for i, c in enumerate(palette):
        cr.elements[i].position = i / len(palette)
        cr.elements[i].color = rgb(c)
    x, y, z = m.xyz(m.world_pos())
    normal = m.xyz(m.node('ShaderNodeNewGeometry').outputs['Normal'])
    side = m.math('LESS_THAN', m.math('ABSOLUTE', normal[2]), 0.5)
    across = m.math('ADD', x, y)
    storey = m.math('ADD', 0.44, m.math('MULTIPLY', rnd, 0.07))
    bay = m.math('ADD', 0.31, m.math('MULTIPLY', m.math('FRACT', m.math('MULTIPLY', rnd, 7.0)), 0.17))
    windows = m.math('MULTIPLY', m.band(across, bay, 0.18, 0.82), m.band(z, storey, 0.3, 0.84))
    windows = m.math('MULTIPLY', m.math('MULTIPLY', windows, side), m.math('GREATER_THAN', z, 1.1))
    ledge = m.math('MULTIPLY', m.band(z, storey, 0.0, 0.1), side)
    # Stains at the scale of a facade, and rain streaks running down from the ledges.
    stains = m.photo('dirty_concrete', 1.6)
    streaks = m.node('ShaderNodeTexNoise', m.node('ShaderNodeMapping', m.world_pos(), Scale=(2.2, 2.2, 0.18)).outputs[0],
                     Scale=1.0, Detail=4.0)
    weather = m.math('MULTIPLY', m.math('ADD', 0.55, m.math('MULTIPLY', stains, 0.45)),
                     m.math('SUBTRACT', 1.0, m.math('MULTIPLY', m.math('MAXIMUM', m.math('SUBTRACT', streaks.outputs['Fac'], 0.5), 0.0), 0.7)))
    pane = m.node('ShaderNodeTexNoise', m.world_pos(), Scale=1.6, Detail=1.0)
    glass = m.mix(pane.outputs['Fac'], rgb('#3f5753'), rgb('#9fb3ad'))
    wall = m.times(m.mix(ledge, ramp.outputs['Color'], rgb('#9a998d')), weather)
    color = m.mix(windows, wall, glass)
    bsdf = m.node('ShaderNodeBsdfPrincipled', Base_Color=color, Roughness=m.mixf(windows, 0.88, 0.12))
    # Night: three dice per window (on or off, level, tone) and one per floor for offices.
    cells = m.node('ShaderNodeCombineXYZ', m.cell(across, bay), m.cell(z, storey), m.math('MULTIPLY', rnd, 97.0)).outputs[0]
    dice = m.xyz(m.node('ShaderNodeTexWhiteNoise', cells).outputs['Color'])
    share = m.math('ADD', 0.16, m.math('MULTIPLY', m.math('FRACT', m.math('MULTIPLY', rnd, 13.0)), 0.36))
    office = m.math('GREATER_THAN', m.math('FRACT', m.math('MULTIPLY', rnd, 29.0)), 0.7)
    floor_dice = m.node('ShaderNodeTexWhiteNoise', m.node('ShaderNodeCombineXYZ', rnd, m.cell(z, storey), 5).outputs[0])
    whole_floor = m.math('MULTIPLY', office, m.math('LESS_THAN', floor_dice.outputs['Value'], 0.3))
    on = m.math('MAXIMUM', m.math('LESS_THAN', dice[0], share), whole_floor)
    curtain = m.math('GREATER_THAN', dice[2], 0.78)
    level = m.math('MULTIPLY', m.math('ADD', 0.3, m.math('MULTIPLY', dice[1], 0.7)), m.mixf(curtain, 1.0, 0.45))
    lit = m.math('MULTIPLY', m.math('MULTIPLY', windows, on), level)
    temps = m.node('ShaderNodeValToRGB', dice[2])
    tr = temps.color_ramp
    tr.interpolation = 'LINEAR'
    stops = ((0.0, '#ffad5e'), (0.35, '#ffcf96'), (0.62, '#fff0dc'), (0.86, '#e4edff'), (1.0, '#9db9ff'))
    tr.elements[0].color = rgb(stops[0][1])
    tr.elements[1].color = rgb(stops[-1][1])
    for pos, c in stops[1:-1]:
        tr.elements.new(pos).color = rgb(c)
    lights, _ = m.glow(temps.outputs['Color'], 3.0, lit)
    return m.finish(bsdf.outputs[0], lights=lights)


def weathered(name, color, rough, asset, tile, amount, night=None):
    """A plain surface over a Poly Haven photo texture: its stains and patches break up the flat colour by `amount`."""
    m = Mat(name)
    tone = m.math('ADD', 1.0 - amount, m.math('MULTIPLY', m.photo(asset, tile), amount))
    bsdf = m.node('ShaderNodeBsdfPrincipled', Base_Color=m.times(rgb(color), tone), Roughness=rough)
    lights = m.glow(rgb(night[0]), night[1])[0] if night else None
    return m.finish(bsdf.outputs[0], lights=lights)


def brick_material():
    """Red Marseille brick laid in courses, with cream stone bands every few metres as on the cathedral."""
    m = Mat('brick')
    x, y, z = m.xyz(m.world_pos())
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
    rings = m.node('ShaderNodeTexWave', m.node('ShaderNodeTexCoord').outputs['Object'], Scale=11.0)
    rings.wave_type = 'RINGS'
    rings.rings_direction = 'Z'
    color = m.mix(m.math('MULTIPLY', rings.outputs['Fac'], 0.3), rgb('#f1e3b6'), rgb('#b99d62'))
    bsdf = m.node('ShaderNodeBsdfPrincipled', Base_Color=color, Roughness=0.7)
    bsdf.inputs['Subsurface Weight'].default_value = 0.25
    bsdf.inputs['Subsurface Radius'].default_value = (0.4, 0.3, 0.15)
    return m.finish(bsdf.outputs[0])


def wood_material():
    """The ghe: tarred planks, a little lighter where the sun and the water have worn them."""
    m = Mat('wood')
    coords = m.node('ShaderNodeTexCoord').outputs['Object']
    planks = m.node('ShaderNodeTexWave', coords, Scale=6.0, Distortion=1.5, Detail=2.0)
    planks.wave_type = 'BANDS'
    planks.bands_direction = 'Z'
    grain = m.node('ShaderNodeTexNoise', m.node('ShaderNodeMapping', coords, Scale=(0.3, 4.0, 4.0)).outputs[0],
                   Scale=6.0, Detail=6.0)
    color = m.mix(m.math('MULTIPLY', grain.outputs['Fac'], 0.7), rgb('#3b261a'), rgb('#6a4a32'))
    color = m.mix(m.math('MULTIPLY', planks.outputs['Fac'], 0.35), color, rgb('#22160f'))
    bsdf = m.node('ShaderNodeBsdfPrincipled', Base_Color=color, Roughness=0.55)
    bsdf.inputs['Coat Weight'].default_value = 0.25
    return m.finish(bsdf.outputs[0])


def sack_material():
    """Woven polypropylene sacks, the white bao of every ve chai cart."""
    m = Mat('sack')
    coords = m.node('ShaderNodeTexCoord').outputs['Object']
    weave = m.node('ShaderNodeTexWave', coords, Scale=40.0)
    weave.bands_direction = 'DIAGONAL'
    color = m.mix(m.math('MULTIPLY', weave.outputs['Fac'], 0.12), rgb('#eeeee6'), rgb('#c9c7bb'))
    bsdf = m.node('ShaderNodeBsdfPrincipled', Base_Color=color, Roughness=0.65)
    bsdf.inputs['Sheen Weight'].default_value = 0.3
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
    """The Saigon river: brown-green water with a real Fresnel mirror, so the sky and the skyline double in it; swells
    and ripples run along the banks, so reflections break into horizontal streaks."""
    m = Mat('water')
    pos = m.world_pos()
    swell = m.node('ShaderNodeTexNoise', m.node('ShaderNodeMapping', pos, Scale=(0.03, 0.22, 1.0)).outputs[0],
                   Scale=1.0, Detail=5.0, Roughness=0.6)
    ripple = m.node('ShaderNodeTexWave', m.node('ShaderNodeMapping', pos, Scale=(0.05, 0.6, 1.0)).outputs[0],
                    Scale=2.0, Distortion=10.0, Detail=5.0, Detail_Scale=2.5)
    ripple.wave_type = 'BANDS'
    ripple.bands_direction = 'Y'
    height = m.math('ADD', swell.outputs['Fac'], m.math('MULTIPLY', ripple.outputs['Fac'], 0.4))
    normal = m.node('ShaderNodeBump', Strength=0.18, Distance=0.12, Height=height).outputs[0]
    bsdf = m.node('ShaderNodeBsdfPrincipled', Base_Color=rgb('#1d2f24'), Roughness=0.03, IOR=1.333, Normal=normal)
    bsdf.inputs['Specular IOR Level'].default_value = 0.5
    return m.finish(bsdf.outputs[0], haze=False)


def cloud_material(name, scale, stretch, coverage, softness):
    """A layer of cloud on a flat sheet high over the city: fBm cover, lit edges where the cover thins towards the sun
    (the same noise sampled a step towards the sun), a darker belly, fading out with distance into the haze. The colours
    come from TUNE['cloud'] per time of day."""
    m = Mat(name)
    pos = m.world_pos()
    mapped = m.node('ShaderNodeMapping', pos, Scale=(scale, scale * stretch, scale)).outputs[0]
    toward = m.node('ShaderNodeVectorMath', mapped, (0, 0, 0))
    toward.operation = 'ADD'
    cover = m.node('ShaderNodeTexNoise', mapped, Scale=1.0, Detail=8.0, Roughness=0.62)
    ahead = m.node('ShaderNodeTexNoise', toward.outputs[0], Scale=1.0, Detail=8.0, Roughness=0.62)
    big = m.node('ShaderNodeTexNoise', m.node('ShaderNodeMapping', pos, Scale=(0.0007, 0.0012, 1)).outputs[0],
                 Scale=1.0, Detail=2.0)
    density = m.math('ADD', cover.outputs['Fac'], m.math('MULTIPLY', m.math('SUBTRACT', big.outputs['Fac'], 0.5), 0.6))
    th = m.node('ShaderNodeValue')
    th.outputs[0].default_value = coverage
    alpha = m.node('ShaderNodeMapRange', density, th.outputs[0], m.math('ADD', th.outputs[0], softness), 0.0, 1.0).outputs[0]
    distance = m.node('ShaderNodeCameraData').outputs['View Distance']
    fade = m.node('ShaderNodeMapRange', distance, 2500.0, 9000.0, 1.0, 0.0).outputs[0]
    amount = m.node('ShaderNodeValue')
    alpha = m.math('MULTIPLY', m.math('MULTIPLY', alpha, fade), amount.outputs[0])
    edge = m.node('ShaderNodeMapRange', m.math('SUBTRACT', cover.outputs['Fac'], ahead.outputs['Fac']), -0.05, 0.08,
                  0.0, 1.0).outputs[0]
    shade, lit, rim = (m.node('ShaderNodeRGB') for _ in range(3))
    color = m.mix(edge, shade.outputs[0], lit.outputs[0])
    color = m.mix(m.math('MULTIPLY', m.math('SUBTRACT', 1.0, alpha), 0.8), color, rim.outputs[0])
    strength = m.node('ShaderNodeValue')
    glow = m.node('ShaderNodeEmission', color, strength.outputs[0])
    shader = m.node('ShaderNodeMixShader', alpha, m.node('ShaderNodeBsdfTransparent').outputs[0], glow.outputs[0])
    TUNE['cloud'].append({'name': name, 'shade': shade, 'lit': lit, 'rim': rim, 'strength': strength,
                          'amount': amount, 'toward': toward, 'threshold': th})
    m.mat.blend_method = 'BLEND'
    return m.finish(shader.outputs[0], haze=False)


def mist_material():
    """Low mist: a curtain thick at the water and thinning upwards, broken by noise."""
    m = Mat('mist')
    # The curtain stands upright, so its own y runs up.
    gz = m.xyz(m.node('ShaderNodeTexCoord').outputs['Generated'])[1]
    up = m.node('ShaderNodeMapRange', gz, 0.0, 1.0, 1.0, 0.0).outputs[0]
    up = m.math('POWER', up, 2.2)
    noise = m.node('ShaderNodeTexNoise', m.node('ShaderNodeMapping', m.world_pos(), Scale=(0.02, 0.02, 0.2)).outputs[0],
                   Scale=1.0, Detail=5.0)
    amount = m.node('ShaderNodeValue')
    alpha = m.math('MULTIPLY', m.math('MULTIPLY', up, noise.outputs['Fac']), amount.outputs[0])
    tint = m.node('ShaderNodeRGB')
    strength = m.node('ShaderNodeValue')
    glow = m.node('ShaderNodeEmission', tint.outputs[0], strength.outputs[0])
    shader = m.node('ShaderNodeMixShader', alpha, m.node('ShaderNodeBsdfTransparent').outputs[0], glow.outputs[0])
    TUNE['mist'] = {'amount': amount, 'tint': tint, 'strength': strength}
    m.mat.blend_method = 'BLEND'
    return m.finish(shader.outputs[0], haze=False)


def lamp_material(name, color, strength):
    m = Mat(name)
    glow, _ = m.glow(rgb(color), strength)
    base = m.node('ShaderNodeBsdfPrincipled', Base_Color=rgb('#d8d2c0'), Roughness=0.4)
    return m.finish(base.outputs[0], haze=True, lights=glow)


MATS = {
    'cream': weathered('cream', '#ead7a0', 0.85, 'dirty_concrete', 2.0, 0.3),
    'trim': weathered('trim', '#f6eed6', 0.8, 'dirty_concrete', 2.0, 0.2),
    'terracotta': principled('terracotta', '#b5603f', 0.75),
    'dark': principled('dark', '#33261e', 0.95, night=('#ffc979', 1.6)),
    'shade': principled('shade', '#5b4a3a', 0.9, night=('#ffd08a', 1.4)),
    'clock': principled('clock', '#fffaea', 0.4, night=('#fff2d0', 3.0)),
    'brick': brick_material(),
    'slate': principled('slate', '#46504e', 0.42, 0.25),
    'gold': principled('gold', '#e7c46a', 0.3, 1.0, night=('#ffd27a', 2.0)),
    'rose': principled('rose', '#5a3b33', 0.2, night=('#ffb45e', 2.5)),
    'l81': glass_curtain('l81 glass', '#93b6bb', '#bccdca', 0.55, 0.24, night=('#bfe3ff', 0.0), lit_share=0.2),
    'bitexco': glass_curtain('bitexco glass', '#86b4aa', '#b7cdc5', 0.5, 0.3, angular=True,
                             night=('#9fd8ff', 1.4), lit_share=0.13),
    'fins': principled('fins', '#e8f1df', 0.3, 0.7, night=('#e6f6ff', 4.0)),
    'pad': principled('helipad', '#5fa595', 0.45, 0.3),
    'paint': principled('helipad paint', '#f3f6ea', 0.6),
    'concrete': weathered('concrete', '#e3e4da', 0.6, 'concrete_layers_02', 1.2, 0.35),
    'cable': principled('cable', '#f4f6ee', 0.4, 0.6, night=('#f2f8ff', 6.0)),
    'ground': principled('ground', '#5d6c5b', 0.95),
    'quay': weathered('quay', '#9a9c8a', 0.9, 'concrete_layers_02', 0.8, 0.6),
    'city': city_material(),
    'trunk': principled('trunk', '#5e5243', 0.95),
    'foliage': foliage_material(),
    'wood': wood_material(),
    'rim': principled('rim', '#2f6b6a', 0.5),
    'red': principled('red', '#a8322b', 0.5),
    'cardboard': principled('cardboard', '#bd955f', 0.9),
    'cardboard2': principled('cardboard light', '#d0ad78', 0.9),
    'sack': sack_material(),
    'bottles': principled('bottles', '#bfe0e6', 0.1, Transmission_Weight=0.7, IOR=1.45),
    'basket': principled('basket', '#a07a46', 0.8),
    'shirt': principled('shirt', '#5f86a8', 0.75, Sheen_Weight=0.4),
    'trousers': principled('trousers', '#24262b', 0.85, Sheen_Weight=0.3),
    'skin': principled('skin', '#c18f66', 0.55, Subsurface_Weight=0.3),
    'straw': straw_material(),
    'water': water_material(),
    'cumulus': cloud_material('cumulus', 0.0022, 1.5, 0.56, 0.1),
    'cirrus': cloud_material('cirrus', 0.0007, 7.0, 0.6, 0.18),
    'mist': mist_material(),
    'lamp': lamp_material('lamp', '#ffcf86', 12.0),
    'lantern': lamp_material('lantern', '#ffb35c', 18.0),
    'aviation': lamp_material('aviation', '#ff2a18', 40.0),
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


def group(name, at, parent=None):
    empty = bpy.data.objects.new(name, None)
    empty.location = at
    empty.parent = parent
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
    """A cone or frustum standing on the z axis, centred at `at`."""
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


def tube(name, points, radius, mat, parent=None, smooth=False):
    """A round bar along a polyline (stays, oars, arms), or a smooth curve through the points."""
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new('NURBS' if smooth else 'POLY')
    spline.points.add(len(points) - 1)
    for p, co in zip(spline.points, points):
        p.co = (*co, 1)
    if smooth:
        spline.use_endpoint_u = True
        spline.order_u = 3
    curve.materials.append(MATS[mat])
    obj = bpy.data.objects.new(name, curve)
    obj.parent = parent
    collection.objects.link(obj)
    return obj


def sheet(name, size, at, mat, rot=(0, 0, 0)):
    """A flat plane (clouds, mist curtains)."""
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    bmesh.ops.scale(bm, vec=(size[0], size[1], 1), verts=bm.verts)
    obj = link(name, bm, mat, at)
    obj.rotation_euler = rot
    return obj


def visibility(obj, camera=True, diffuse=True, glossy=True, shadow=True, transmission=True):
    obj.visible_camera = camera
    obj.visible_diffuse = diffuse
    obj.visible_glossy = glossy
    obj.visible_shadow = shadow
    obj.visible_transmission = transmission


# ---------------------------------------------------------------------------------------------------------------------
# The city

# Ground: two quays with the inlet the Ba Son bridge crosses between them, and the land running on to the horizon.
for x0, x1 in ((-2000, 60), (80, 2000)):
    box('quay', (x1 - x0, 300, 1.2), ((x0 + x1) / 2, 150, 0), 'ground')
    box('quay edge', (x1 - x0, 0.6, 1.3), ((x0 + x1) / 2, 0.1, 0), 'quay')
box('inlet back', (20, 270, 1.2), (70, 165, 0), 'ground')
box('hinterland', (8000, 6000, 1.0), (40, 3290, 0.1), 'ground')

# Far city: low on the left (under the copy), denser and taller behind the towers; a second, hazier band behind it.
for i in range(420):
    x = -520 + rand() * 1020
    z = -18 - rand() * (120 if i < 300 else 340)
    if 58 < x < 82 and z > -40:
        continue
    right = min(1, max(0, (x + 20) / 140))
    depth = (-z - 18) / 120
    near = 0.45 if any(abs(x - lx) < 9 for lx in (8, 26, 46, 102)) else 1
    if -140 < x < -4 and z > -140:
        h = 1.5 + rand() * (1.5 + depth * 2)
    else:
        a = rand()
        b = rand()
        h = (2 + a * (4 + right * 14 + min(depth, 1.5) * 10) + (right * 14 if b > 0.9 else 0)) * near
    w = 4 + rand() * 7
    d = 4 + rand() * 7
    rand()
    box('block', (w, d, h), (x, -z, h / 2 + 0.6), 'city', round_=0.22)
    # Rooftop clutter on taller blocks: a water tank or a stair house, as on Saigon apartment roofs.
    if h > 6 and (i % 3 == 0):
        box('roof box', (min(w, 2.4), min(d, 2.0), 1.1), (x + w * 0.18, -z + d * 0.1, h + 0.6 + 0.55), 'quay', round_=0.1)
    # Red aviation lights on the tall roofs, a scatter of red points over the city at night.
    if h > 14:
        sphere('aviation light', 0.16, (x - w * 0.35, -z - d * 0.35, h + 0.8), 'aviation', subdiv=1)

# Cây dầu along the river: tall bare trunks, crowns high up.
spots = []
x = -400.0
while x < 360:
    if not (-140 < x < 34 or 40 < x < 110):
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

# Riverside lamps along the far quay: dark heads by day, a string of warm lights doubled in the river at night.
x = -300.0
while x < 400:
    if not 58 < x < 82:
        cone('lamp post', 0.07, 0.05, 2.2, (x, -0.4, 1.7), 'concrete', segments=6)
        sphere('lamp', 0.22, (x, -0.4, 2.85), 'lamp', subdiv=2)
    x += 7.5

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
box('hand long', (0.14, 0.05, 0.95), (0, -4.42, 13.62), 'slate', market)
box('hand short', (0.7, 0.05, 0.12), (0.3, -4.42, 13.2), 'slate', market)
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
# Floodlights for the night: warm washes from the square in front.
floods = []
for x in (-6, 6):
    data = bpy.data.lights.new('flood', 'SPOT')
    data.color = (1.0, 0.78, 0.55)
    data.spot_size = math.radians(70)
    data.spot_blend = 0.8
    data.shadow_soft_size = 0.5
    flood = bpy.data.objects.new('flood', data)
    flood.location = (26 + x, -6, 0.8)
    flood.rotation_euler = (Vector((26, 10, 14)) - flood.location).to_track_quat('-Z', 'Y').to_euler()
    collection.objects.link(flood)
    floods.append(data)

# Bitexco Financial Tower: the lotus bud on an elliptical plan and a low podium, the helipad cantilevered from its west
# face.
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
link('bitexco body', bm, 'bitexco', parent=bitexco, smooth=True)
sphere('aviation light', 0.18, (0, 0, 34.5), 'aviation', bitexco, subdiv=1)
# The podium it stands on, so the bud does not read as balanced on its tip.
box('bitexco podium', (13, 9, 2.6), (0, 0, 1.3), 'bitexco', bitexco, 0.08)
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
for z in (58.2, 52.0):
    sphere('aviation light', 0.2, (0, 0, z), 'aviation', l81, subdiv=1)

# Ba Son bridge: a raised deck over the inlet and one white pylon, curving back from the main span like a blade, the
# stays fanning from its upper half across the main span and a shorter back fan behind it.
bridge = group('cau ba son', (0, 0, 0))
box('deck', (46, 3.4, 0.9), (69, 6, 4.2), 'concrete', bridge, 0.1)
box('railing', (46, 0.12, 0.35), (69, 4.35, 4.85), 'cable', bridge)
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


# ---------------------------------------------------------------------------------------------------------------------
# The ghe ve chai: a wooden sampan with raised ends and a painted rim, loaded with the day's sorted haul (bundled
# cardboard, white woven sacks of bottles, a basket of cans), its rower standing at the stern with the long oar.

def hull(length, beam, depth, sheer):
    """A lofted hull: U sections that narrow to the stem and stern, the gunwale rising towards both ends."""
    bm = bmesh.new()
    sections = 40
    ring = 14
    grid = []
    for i in range(sections + 1):
        u = -1 + 2 * i / sections
        half = beam / 2 * max(0.02, (1 - abs(u) ** 2.2)) ** 0.55
        top = depth * 0.45 + sheer * abs(u) ** 3.2
        keel = -depth * 0.55 * (1 - abs(u) ** 6) + top * abs(u) ** 6 * 0.6
        row = []
        for k in range(ring + 1):
            t = math.pi * k / ring
            row.append(bm.verts.new((u * length / 2, -half * math.cos(t), top - (top - keel) * math.sin(t) ** 0.7)))
        grid.append(row)
    for a, b in zip(grid, grid[1:]):
        for k in range(ring):
            bm.faces.new((a[k], b[k], b[k + 1], a[k + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


boat = group('ghe ve chai', (0, 0, 0.12))
hull_obj = link('hull', hull(8.6, 2.0, 1.1, 1.0), 'wood', parent=boat, smooth=True)
hull_obj.modifiers.new('planks', 'SOLIDIFY').thickness = 0.08
hull_obj.modifiers.new('smooth', 'SUBSURF').levels = 1
box('deck', (5.0, 1.3, 0.08), (0, 0, 0.12), 'wood', boat, 0.03)
for side in (-1, 1):
    rail = [(x, side * (0.99 * max(0.02, 1 - abs(x / 4.3) ** 2.2) ** 0.55), 0.5 + 1.0 * abs(x / 4.3) ** 3.2 + 0.03)
            for x in (-4.0, -3.2, -2.2, -1.0, 0, 1.0, 2.2, 3.2, 4.0)]
    tube('painted rim', rail, 0.07, 'rim', boat, smooth=True)
    sphere('mat ghe', 0.17, (-3.55, side * 0.57, 0.9), 'red', boat, subdiv=2, scale=(1.4, 0.3, 0.8))
# The haul.
for size, mat, at, r in (((1.4, 1.2, 0.6), 'cardboard', (-2.3, 0, 0.45), 0.06),
                         ((1.3, 1.1, 0.55), 'cardboard2', (-2.25, 0.05, 1.02), 0.06),
                         ((1.2, 1.0, 0.45), 'cardboard', (-2.32, -0.04, 1.5), 0.05)):
    bevel(box('carton bundle', size, at, mat, boat), r, 3)
    box('twine', (size[0] + 0.02, 0.05, size[2] + 0.02), (at[0], at[1], at[2]), 'basket', boat)
for at, s in (((-0.85, -0.25, 0.75), (0.75, 0.62, 0.72)), ((-0.6, 0.38, 0.7), (0.7, 0.58, 0.66)),
              ((-0.75, 0.05, 1.45), (0.62, 0.55, 0.55)), ((0.45, -0.1, 0.7), (0.72, 0.62, 0.7))):
    sack = sphere('bao ve chai', 1.0, at, 'sack', boat, subdiv=3, scale=s)
    disp = sack.modifiers.new('bulges', 'DISPLACE')
    tex = bpy.data.textures.new('bottles inside', 'VORONOI')
    tex.noise_scale = 0.18
    disp.texture = tex
    disp.strength = 0.08
    disp.texture_coords = 'GLOBAL'
    cone('tied neck', 0.12, 0.06, 0.25, (at[0], at[1], at[2] + s[2] * 0.95), 'sack', boat, segments=8, smooth=True)
cone('thung', 0.55, 0.42, 0.55, (1.35, 0.25, 0.45), 'basket', boat, segments=24, smooth=True)
for k in range(7):
    a = k / 7 * math.tau
    cone('lon', 0.09, 0.09, 0.26, (1.35 + math.cos(a) * 0.25, 0.25 + math.sin(a) * 0.25, 0.8), 'fins', boat, segments=10)
for k in range(5):
    a = k / 5 * math.tau
    cone('chai', 0.08, 0.05, 0.42, (0.4 + math.cos(a) * 0.3, -0.62, 0.55 + 0.05 * k), 'bottles', boat, segments=10, smooth=True)

# The rower: standing at the stern in an áo bà ba and black trousers, both hands on the long oar, nón lá tied on.
rower = group('nguoi cheo', (2.75, 0.05, 0.16), boat)
rower.rotation_euler.z = math.radians(-12)
for leg in (-1, 1):
    tube('leg', [(0.05 * leg, leg * 0.2, 0.0), (0.0, leg * 0.17, 0.75), (-0.05, leg * 0.13, 1.35)], 0.15, 'trousers',
         rower, smooth=True)
    sphere('foot', 0.12, (0.12, leg * 0.2, 0.05), 'skin', rower, subdiv=2, scale=(1.5, 0.8, 0.5))
sphere('hips', 0.33, (-0.05, 0, 1.4), 'trousers', rower, scale=(0.9, 1.15, 0.7))
torso = sphere('ao ba ba', 0.42, (0.0, 0, 1.95), 'shirt', rower, scale=(0.75, 1.05, 1.45))
torso.rotation_euler.y = math.radians(12)
sphere('neck', 0.11, (0.1, 0, 2.48), 'skin', rower, subdiv=2, scale=(1, 1, 1.3))
sphere('head', 0.23, (0.14, 0, 2.72), 'skin', rower)
hat = cone('non la', 0.78, 0.0, 0.46, (0.14, 0, 2.98), 'straw', rower, segments=64, cap=False, smooth=True)
hat.modifiers.new('thickness', 'SOLIDIFY').thickness = 0.02
tube('quai non', [(0.14, -0.2, 2.8), (0.28, -0.12, 2.56), (0.28, 0.12, 2.56), (0.14, 0.2, 2.8)], 0.012, 'red', rower,
     smooth=True)
grip_hi, grip_lo = Vector((0.75, -0.42, 2.25)), Vector((0.55, -0.4, 1.55))
for shoulder, grip in (((0.06, -0.36, 2.25), grip_hi), ((0.06, 0.36, 2.25), grip_lo)):
    elbow = ((shoulder[0] + grip.x) / 2 + 0.1, (shoulder[1] + grip.y) / 2 - 0.12, (shoulder[2] + grip.z) / 2 - 0.12)
    tube('arm', [shoulder, elbow, tuple(grip)], 0.085, 'shirt', rower, smooth=True)
    sphere('hand', 0.075, tuple(grip), 'skin', rower, subdiv=2)
oar_top, oar_tip = Vector((0.95, -0.44, 2.65)), Vector((2.3, -0.5, -1.4))
tube('mai cheo', [tuple(oar_top), tuple(oar_tip)], 0.045, 'wood', rower)
blade_obj = box('la cheo', (0.12, 0.05, 1.1), tuple(oar_tip + (oar_top - oar_tip).normalized() * 0.45), 'wood', rower, 0.02)
blade_obj.rotation_euler.y = -math.atan2(oar_top.x - oar_tip.x, oar_top.z - oar_tip.z)
# A lantern on a short pole at the bow, lit at night.
tube('cot den', [(-3.6, 0, 0.9), (-3.75, 0, 2.0)], 0.03, 'wood', boat)
sphere('den', 0.14, (-3.75, 0, 1.88), 'lantern', boat, subdiv=2, scale=(1, 1, 1.3))
lantern = bpy.data.lights.new('lantern', 'POINT')
lantern.color = (1.0, 0.7, 0.4)
lantern.shadow_soft_size = 0.2
lantern_obj = bpy.data.objects.new('lantern', lantern)
lantern_obj.location = (-3.75, 0, 1.88)
lantern_obj.parent = boat
collection.objects.link(lantern_obj)

# The Saigon river, wide enough to reach every edge of every frame.
water = box('song sai gon', (6000, 2000, 0.05), (40, -1000, -0.03), 'water')

# Sky dressing: two cloud layers and low mist curtains (seen by the camera and in reflections; they light nothing).
for name, z in (('cumulus', 160), ('cirrus', 420)):
    layer = sheet(name, (30000, 18000), (40, 8000, z), name)
    visibility(layer, diffuse=False, shadow=False, transmission=False)
for y, z, h in ((-6, 0, 7), (60, 0, 12), (240, 0, 20)):
    curtain = sheet('mist', (3000, h), (40, y, z + h / 2), 'mist', rot=(math.pi / 2, 0, 0))
    visibility(curtain, diffuse=False, shadow=False, transmission=False)


# ---------------------------------------------------------------------------------------------------------------------
# Light and sky per time of day

world = bpy.data.worlds.new('sky')
scene.world = world
world.use_nodes = True
wn, wl = world.node_tree.nodes, world.node_tree.links
wn.clear()


def wnode(kind, *inputs, **props):
    n = wn.new(kind)
    for k, v in props.items():
        setattr(n, k, v)
    for i, v in enumerate(inputs):
        if isinstance(v, bpy.types.NodeSocket):
            wl.new(v, n.inputs[i])
        elif v is not None:
            n.inputs[i].default_value = v
    return n


# What lights the city: a physical sky (Nishita), seen only by diffuse rays.
sky = wnode('ShaderNodeTexSky', sky_type='NISHITA', sun_disc=False)
lit = wnode('ShaderNodeBackground', sky.outputs[0])
# What the camera and the river see: an art-directed sky per time of day. A colour ramp over the elevation, a glow
# around the sun (wide and tight lobes), and stars at night.
view = wnode('ShaderNodeVectorMath', wnode('ShaderNodeTexCoord').outputs['Generated'], operation='NORMALIZE')
elevation = wnode('ShaderNodeSeparateXYZ', view.outputs[0]).outputs[2]
lift = wnode('ShaderNodeMath', elevation, 0.5, operation='POWER')
below = wnode('ShaderNodeMath', elevation, 0.0, operation='GREATER_THAN')
ramp = wnode('ShaderNodeValToRGB', wnode('ShaderNodeMath', lift.outputs[0], below.outputs[0], operation='MULTIPLY').outputs[0])
sky_stops = [ramp.color_ramp.elements[0], ramp.color_ramp.elements[1]] + [ramp.color_ramp.elements.new(0.5) for _ in range(3)]
sun_vec = wnode('ShaderNodeCombineXYZ')
facing = wnode('ShaderNodeMath', wnode('ShaderNodeVectorMath', view.outputs[0], sun_vec.outputs[0],
                                       operation='DOT_PRODUCT').outputs['Value'], 0.0, operation='MAXIMUM')
lobes = []
glow_sum = None
for power in (6.0, 60.0, 900.0):
    amount = wnode('ShaderNodeValue')
    lobes.append(amount)
    lobe = wnode('ShaderNodeMath', wnode('ShaderNodeMath', facing.outputs[0], power, operation='POWER').outputs[0],
                 amount.outputs[0], operation='MULTIPLY')
    glow_sum = lobe if glow_sum is None else wnode('ShaderNodeMath', glow_sum.outputs[0], lobe.outputs[0], operation='ADD')
glow_color = wnode('ShaderNodeRGB')
glow = wnode('ShaderNodeMix', 1.0, data_type='RGBA', blend_type='MULTIPLY')
wl.new(glow_color.outputs[0], glow.inputs[6])
wl.new(glow_sum.outputs[0], glow.inputs[7])
with_glow = wnode('ShaderNodeMix', 1.0, data_type='RGBA', blend_type='ADD')
wl.new(ramp.outputs[0], with_glow.inputs[6])
wl.new(glow.outputs[2], with_glow.inputs[7])
# Stars: a voronoi cell in ten holds one, of random brightness; only above the horizon.
stars = wnode('ShaderNodeTexVoronoi', view.outputs[0], None, 420.0)
star_dot = wnode('ShaderNodeMapRange', stars.outputs['Distance'], 0.04, 0.0, 0.0, 1.0)
star_keep = wnode('ShaderNodeMapRange', wnode('ShaderNodeSeparateColor', stars.outputs['Color']).outputs[0], 0.9, 1.0, 0.0, 1.0)
star_amount = wnode('ShaderNodeValue')
star_light = wnode('ShaderNodeMath', wnode('ShaderNodeMath', star_dot.outputs[0], star_keep.outputs[0],
                                           operation='MULTIPLY').outputs[0], star_amount.outputs[0], operation='MULTIPLY')
star_light = wnode('ShaderNodeMath', star_light.outputs[0], below.outputs[0], operation='MULTIPLY')
seen_color = wnode('ShaderNodeMix', 1.0, data_type='RGBA', blend_type='ADD')
wl.new(with_glow.outputs[2], seen_color.inputs[6])
wl.new(star_light.outputs[0], seen_color.inputs[7])
seen = wnode('ShaderNodeBackground', seen_color.outputs[2])
# At night the physical sky has nothing to give; the art sky's dim blue lights the city instead.
ambient = wnode('ShaderNodeMixShader', 0.0, lit.outputs[0], seen.outputs[0])
pick = wnode('ShaderNodeMixShader', wnode('ShaderNodeLightPath').outputs['Is Diffuse Ray'], seen.outputs[0],
             ambient.outputs[0])
wnode('ShaderNodeOutputWorld', pick.outputs[0])

sun_data = bpy.data.lights.new('sun', 'SUN')
sun = bpy.data.objects.new('sun', sun_data)
collection.objects.link(sun)
# The visible sun for the sunset frame: a glowing disc far beyond the city, behind which it sinks.
disc_mat = Mat('sun disc')
sun_glow = disc_mat.node('ShaderNodeEmission', (1.0, 0.62, 0.3, 1), 60.0)
MATS['sun'] = disc_mat.finish(sun_glow.outputs[0], haze=False)
sun_disc = sphere('sun disc', 60, (0, 9000, 0), 'sun', subdiv=3)
visibility(sun_disc, diffuse=False, shadow=False, transmission=False)

PARTS_SETUP = {
    # sun: (azimuth in the wide frame, azimuth in the tall frame, elevation), colour and strength; light: the physical
    # sky's strength and Nishita air, dust and ozone; sky: the art sky's ramp stops (on the square root of the
    # elevation), glow colour and lobes, stars, strength; then haze, the share of city lights, the two cloud layers
    # (shade, lit, rim, strength, amount, coverage), mist (tint, amount, strength), exposure and look; glare =
    # (threshold, size) where it differs from the default bloom.
    # Dawn rises low on the left, soft and pastel, with mist on the water; sunset sinks on the right, deep and gold.
    'dawn': dict(sun=(-38, -17, 3.5), sun_color='#ffc39a', sun_energy=3.6,
                 light=dict(strength=0.3, air=1.0, dust=3.0, ozone=5.0, art=0.0),
                 sky=dict(stops=[(0.0, '#ffd49a'), (0.12, '#ffb4a6'), (0.3, '#d8a6cb'), (0.6, '#8f9ed2'), (1.0, '#5c7bc2')],
                          glow='#ffdca8', lobes=(0.5, 1.0, 14.0), stars=0.0, strength=1.3),
                 haze='#f3cbbd', haze_strength=0.85, lights=0.1,
                 cumulus=('#a3889f', '#ffc9b0', '#ffd9cf', 1.3, 0.55, 0.6),
                 cirrus=('#b893b0', '#ffcfb8', '#ffe0d6', 1.35, 0.8, 0.6),
                 mist=('#fbe0d6', 0.85, 1.05), exposure=0.0, look='AgX - Medium High Contrast',
                 disc=('#ffe1b0', 30.0)),
    'day': dict(sun=(140, 140, 58), sun_color='#fff4e4', sun_energy=4.4,
                light=dict(strength=0.22, air=1.0, dust=1.2, ozone=2.0, art=0.0),
                sky=dict(stops=[(0.0, '#d4e2e6'), (0.15, '#aecde4'), (0.35, '#7eb1df'), (0.6, '#5294d4'), (1.0, '#3274c2')],
                         glow='#ffffff', lobes=(0.0, 0.0, 0.0), stars=0.0, strength=1.2),
                haze='#cddce2', haze_strength=1.05, lights=0.0,
                cumulus=('#a7b6c8', '#ffffff', '#f2f6fa', 1.45, 0.9, 0.585),
                cirrus=('#c8d5e2', '#ffffff', '#f4f8fc', 1.4, 0.3, 0.7),
                mist=('#e8eef0', 0.15, 1.0), exposure=-0.15, look='AgX - Medium High Contrast', disc=None),
    'sunset': dict(sun=(31, 11, 5.5), sun_color='#ff9d54', sun_energy=3.4,
                   light=dict(strength=0.25, air=1.0, dust=6.0, ozone=3.0, art=0.0),
                   sky=dict(stops=[(0.0, '#ffd08a'), (0.15, '#f7a676'), (0.32, '#d98a8a'), (0.55, '#8a76a2'), (1.0, '#3d4c7c')],
                            glow='#ffcf8a', lobes=(0.55, 1.4, 25.0), stars=0.0, strength=1.15),
                   haze='#f2b585', haze_strength=0.95, lights=0.35,
                   cumulus=('#77566a', '#ffb06e', '#ffd6a6', 1.3, 0.58, 0.58),
                   cirrus=('#93607a', '#ffbd80', '#ffdcb6', 1.4, 0.75, 0.58),
                   mist=('#f8c9a2', 0.5, 1.0), exposure=-0.1, look='AgX - Medium High Contrast',
                   disc=('#ffa04d', 60.0)),
    'night': dict(sun=(225, 225, 38), sun_color='#9fb4ff', sun_energy=0.06,
                  light=dict(strength=0.0, air=1.0, dust=1.0, ozone=2.0, art=1.0),
                  sky=dict(stops=[(0.0, '#5a443c'), (0.1, '#33344a'), (0.3, '#18233e'), (0.6, '#0e1832'), (1.0, '#070e22')],
                           glow='#000000', lobes=(0.0, 0.0, 0.0), stars=0.15, strength=1.0),
                  haze='#27334a', haze_strength=0.6, lights=1.0,
                  cumulus=('#151c2e', '#3a4566', '#4b5878', 0.5, 0.5, 0.6),
                  cirrus=('#1a2236', '#3c4868', '#4e5a7a', 0.45, 0.6, 0.6),
                  mist=('#3b4864', 0.3, 0.6), exposure=0.55, look='AgX - Medium High Contrast', disc=None,
                  glare=(5.0, 6)),
}


def set_part(part, frame):
    p = PARTS_SETUP[part]
    az = p['sun'][0] if frame == 'wide' else p['sun'][1]
    sun_dir = direction(az, p['sun'][2])
    sun.rotation_euler = (-sun_dir).to_track_quat('-Z', 'Y').to_euler()
    sun_data.color = rgb(p['sun_color'])[:3]
    sun_data.energy = p['sun_energy']
    sun_data.angle = math.radians(1.2)
    light = p['light']
    sky.sun_elevation = math.radians(p['sun'][2])
    sky.sun_rotation = math.radians(az)
    sky.air_density = light['air']
    sky.dust_density = light['dust']
    sky.ozone_density = light['ozone']
    lit.inputs['Strength'].default_value = light['strength']
    ambient.inputs[0].default_value = light['art']
    art = p['sky']
    for el, (pos, color) in zip(sky_stops, art['stops']):
        el.position = pos
        el.color = rgb(color)
    glow_color.outputs[0].default_value = rgb(art['glow'])
    for amount, value in zip(lobes, art['lobes']):
        amount.outputs[0].default_value = value
    sun_vec.inputs[0].default_value, sun_vec.inputs[1].default_value, sun_vec.inputs[2].default_value = sun_dir
    star_amount.outputs[0].default_value = art['stars']
    seen.inputs['Strength'].default_value = art['strength']
    for socket in TUNE['haze']:
        socket.default_value = rgb(p['haze'])
    for socket in TUNE['haze_strength']:
        socket.default_value = p['haze_strength']
    for socket, strength in TUNE['lights']:
        socket.default_value = strength * p['lights']
    for data in floods:
        data.energy = 9000 * p['lights']
    lantern.energy = 400 * p['lights']
    for c in TUNE['cloud']:
        shade, lit_color, rim, strength, amount, coverage = p[c['name']]
        c['shade'].outputs[0].default_value = rgb(shade)
        c['lit'].outputs[0].default_value = rgb(lit_color)
        c['rim'].outputs[0].default_value = rgb(rim)
        c['strength'].outputs[0].default_value = strength
        c['amount'].outputs[0].default_value = amount
        c['threshold'].outputs[0].default_value = coverage
        step = direction(az, 0) * 0.03
        c['toward'].inputs[1].default_value = (step.x, step.y, 0.0)
    tint, amount, strength = p['mist']
    TUNE['mist']['tint'].outputs[0].default_value = rgb(tint)
    TUNE['mist']['amount'].outputs[0].default_value = amount
    TUNE['mist']['strength'].outputs[0].default_value = strength
    sun_disc.hide_render = not p['disc']
    if p['disc']:
        sun_glow.inputs['Color'].default_value = rgb(p['disc'][0])
        sun_glow.inputs['Strength'].default_value = p['disc'][1]
    sun_disc.location = direction(az, p['sun'][2]) * 9000 + Vector((camera.location.x, camera.location.y, 0))
    # Bloom: by night only the lamps, the stays and the lantern bloom, so lit windows stay crisp and apart.
    glare.threshold, glare.size = p.get('glare', (2.5, 7))
    scene.view_settings.look = p['look']
    scene.view_settings.exposure = p['exposure']


# ---------------------------------------------------------------------------------------------------------------------
# Cameras. Verticals stay vertical: the camera looks level and lens shift frames the picture.

FRAMES_SETUP = {
    # Laptops and tablets (about 2.2:1): low over the water, the landmarks across the right half, where the copy is not;
    # the ghe in front of the bridge.
    'wide': dict(size=(2560, 1160), eye=(20, -150, 1.6), lens=24.5, horizon=0.71, shift_x=-0.05,
                 boat=(33, -112, 0.12), boat_scale=1.3, boat_turn=-6, focus=40, fstop=11),
    # Phones and portrait tablets (about 0.69:1): further back and higher, the skyline low in the frame under a tall sky for the copy, Landmark
    # 81 on the right where the copy's last short lines leave room; the ghe on the near water below the far bank.
    'tall': dict(size=(1600, 2320), eye=(57, -255, 9.5), lens=62.0, horizon=0.87, shift_x=0.04,
                 boat=(78, -140, 0.12), boat_scale=1.6, boat_turn=-8, focus=115, fstop=14),
}

cam_data = bpy.data.cameras.new('camera')
cam_data.sensor_fit = 'HORIZONTAL'
cam_data.sensor_width = 36
cam_data.clip_start = 0.5
cam_data.clip_end = 20000
camera = bpy.data.objects.new('camera', cam_data)
camera.rotation_euler = (math.pi / 2, 0, 0)
collection.objects.link(camera)
scene.camera = camera


def set_frame(frame):
    f = FRAMES_SETUP[frame]
    w, h = f['size']
    scene.render.resolution_x = round(w * SCALE)
    scene.render.resolution_y = round(h * SCALE)
    camera.location = f['eye']
    cam_data.lens = f['lens']
    # The horizon sits `horizon` of the way down the frame; shift is measured in frame widths.
    cam_data.shift_y = (f['horizon'] - 0.5) * h / w
    cam_data.shift_x = f['shift_x']
    cam_data.dof.use_dof = True
    cam_data.dof.focus_distance = f['focus']
    cam_data.dof.aperture_fstop = f['fstop']
    boat.location = f['boat']
    boat.scale = (f['boat_scale'],) * 3
    boat.rotation_euler.z = math.radians(f['boat_turn'])


# ---------------------------------------------------------------------------------------------------------------------
# Render settings and finishing: a soft bloom on highlights, a trace of lens fringing and a gentle vignette.

render = scene.render
render.engine = 'CYCLES'
render.resolution_percentage = 100
render.film_transparent = False
render.filter_size = 1.3
cycles = scene.cycles
cycles.device = 'CPU'
cycles.samples = SAMPLES
cycles.use_adaptive_sampling = True
cycles.adaptive_threshold = 0.015
cycles.use_denoising = True
cycles.denoiser = 'OPENIMAGEDENOISE'
cycles.max_bounces = 8
cycles.diffuse_bounces = 3
cycles.glossy_bounces = 4
cycles.transmission_bounces = 6
cycles.transparent_max_bounces = 16
cycles.caustics_reflective = False
cycles.caustics_refractive = False
cycles.blur_glossy = 0.6
# Sun glints on bevels and glass would bloom into beacons; clamping keeps them to sparkles.
cycles.sample_clamp_direct = 14.0
cycles.sample_clamp_indirect = 6.0
scene.view_settings.view_transform = 'AgX'

scene.use_nodes = True
comp = scene.node_tree
comp.nodes.clear()
layers = comp.nodes.new('CompositorNodeRLayers')
glare = comp.nodes.new('CompositorNodeGlare')
glare.glare_type = 'FOG_GLOW'
glare.quality = 'HIGH'
glare.threshold = 2.5
glare.size = 7
glare.mix = -0.8
lens = comp.nodes.new('CompositorNodeLensdist')
lens.inputs['Dispersion'].default_value = 0.006
lens.use_fit = True
ellipse = comp.nodes.new('CompositorNodeEllipseMask')
ellipse.mask_width = 1.25
ellipse.mask_height = 1.25
soften = comp.nodes.new('CompositorNodeBlur')
soften.filter_type = 'FAST_GAUSS'
soften.use_relative = True
soften.factor_x = soften.factor_y = 30
vignette = comp.nodes.new('CompositorNodeMixRGB')
vignette.blend_type = 'MULTIPLY'
vignette.inputs['Fac'].default_value = 0.35
to_mask = comp.nodes.new('CompositorNodeMapRange')
to_mask.inputs['To Min'].default_value = 0.55
composite = comp.nodes.new('CompositorNodeComposite')
comp.links.new(layers.outputs['Image'], glare.inputs['Image'])
comp.links.new(glare.outputs['Image'], lens.inputs['Image'])
comp.links.new(ellipse.outputs['Mask'], soften.inputs['Image'])
comp.links.new(soften.outputs['Image'], to_mask.inputs['Value'])
comp.links.new(lens.outputs['Image'], vignette.inputs[1])
comp.links.new(to_mask.outputs['Value'], vignette.inputs[2])
comp.links.new(vignette.outputs['Image'], composite.inputs['Image'])

image = render.image_settings
image.color_mode = 'RGB'
os.makedirs(OUT, exist_ok=True)
SIZES = {'wide': (2560, 1280), 'tall': (1600, 1200, 800)}
for frame in FRAMES:
    set_frame(frame)
    for part in PARTS:
        set_part(part, frame)
        bpy.ops.render.render()
        tmp = os.path.join(OUT, f'.saigon-{part}-{frame}.png')
        image.file_format = 'PNG'
        bpy.data.images['Render Result'].save_render(tmp)
        shot = bpy.data.images.load(tmp)
        w, h = FRAMES_SETUP[frame]['size']
        for size in SIZES[frame]:
            copy = shot.copy()
            copy.scale(round(size * SCALE), round(size * SCALE * h / w))
            copy.file_format = 'WEBP'
            name = f'saigon-{part}-{frame}-{size}.webp' if SCALE == 1 else f'preview-{part}-{frame}-{size}.webp'
            copy.save(filepath=os.path.join(OUT, name), quality=84)
            print('wrote', name, copy.size[:])
        bpy.data.images.remove(shot)
        os.remove(tmp)
