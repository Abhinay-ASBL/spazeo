import { v } from 'convex/values'
import { mutation } from './_generated/server'

const TOWER_SPECS: Record<string, Record<string, { bhk: '1BHK' | '2BHK' | '3BHK' | '4BHK' | 'penthouse'; area: number; facing: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' }>> = {
  A: {
    '1': { bhk: '4BHK', area: 3015, facing: 'E' },
    '2': { bhk: '4BHK', area: 3015, facing: 'E' },
    '3': { bhk: '3BHK', area: 1970, facing: 'N' },
    '4': { bhk: '3BHK', area: 1970, facing: 'N' },
    '5': { bhk: '3BHK', area: 1970, facing: 'W' },
    '6': { bhk: '3BHK', area: 1970, facing: 'W' },
    '7': { bhk: '3BHK', area: 1970, facing: 'S' },
    '8': { bhk: '3BHK', area: 1970, facing: 'S' },
    '9': { bhk: '4BHK', area: 2535, facing: 'W' },
    '10': { bhk: '4BHK', area: 2535, facing: 'W' },
  },
  B: {
    '1': { bhk: '4BHK', area: 2540, facing: 'E' },
    '2': { bhk: '4BHK', area: 2540, facing: 'E' },
    '3': { bhk: '3BHK', area: 2085, facing: 'N' },
    '4': { bhk: '3BHK', area: 1970, facing: 'N' },
    '5': { bhk: '3BHK', area: 1970, facing: 'W' },
    '6': { bhk: '3BHK', area: 1970, facing: 'W' },
    '7': { bhk: '3BHK', area: 1970, facing: 'S' },
    '8': { bhk: '3BHK', area: 2115, facing: 'S' },
    '9': { bhk: '4BHK', area: 2540, facing: 'W' },
    '10': { bhk: '4BHK', area: 2540, facing: 'W' },
  },
  C: {
    '1': { bhk: '4BHK', area: 3015, facing: 'E' },
    '2': { bhk: '4BHK', area: 3015, facing: 'E' },
    '3': { bhk: '3BHK', area: 1970, facing: 'N' },
    '4': { bhk: '3BHK', area: 1970, facing: 'N' },
    '5': { bhk: '3BHK', area: 1970, facing: 'W' },
    '6': { bhk: '3BHK', area: 1970, facing: 'W' },
    '7': { bhk: '3BHK', area: 1970, facing: 'S' },
    '8': { bhk: '3BHK', area: 1970, facing: 'S' },
    '9': { bhk: '4BHK', area: 2535, facing: 'W' },
    '10': { bhk: '4BHK', area: 2535, facing: 'W' },
  },
}

export const seedASBLUnits = mutation({
  args: {},
  handler: async (ctx) => {
    let building = await ctx.db
      .query('buildings')
      .withIndex('by_slug', (q) => q.eq('slug', 'asbl-legacy-towers'))
      .first()

    if (!building) {
      const user = await ctx.db.query('users').first()
      if (!user) throw new Error('No user found in DB to attach building to')

      const buildingId = await ctx.db.insert('buildings', {
        userId: user._id,
        name: 'ASBL Legacy Towers',
        slug: 'asbl-legacy-towers',
        location: { lat: 17.403371, lng: 78.50295 },
        totalFloors: 50,
        totalBlocks: 3,
        status: 'published',
        viewCount: 0,
        environmentType: 'google3d',
      })
      building = (await ctx.db.get(buildingId))!
    }

    const blockIds: Record<string, any> = {}
    for (const towerId of ['A', 'B', 'C']) {
      let block = await ctx.db
        .query('buildingBlocks')
        .withIndex('by_buildingId', (q) => q.eq('buildingId', building._id))
        .filter((q) => q.eq(q.field('name'), `Tower ${towerId}`))
        .first()

      if (!block) {
        const id = await ctx.db.insert('buildingBlocks', {
          buildingId: building._id,
          blockNumber: towerId === 'A' ? 1 : towerId === 'B' ? 2 : 3,
          name: `Tower ${towerId}`,
          apartmentsPerFloor: 10,
        })
        block = (await ctx.db.get(id))!
      }
      blockIds[towerId] = block._id
    }

    let insertedCount = 0

    for (const towerId of ['A', 'B', 'C']) {
      const specs = TOWER_SPECS[towerId]
      const blockId = blockIds[towerId]

      for (let floor = 1; floor <= 50; floor++) {
        for (let u = 1; u <= 10; u++) {
          const uStr = u < 10 ? `0${u}` : `${u}`
          const unitNumber = `${towerId}-${floor}${uStr}`
          const spec = specs[String(u)]

          const existing = await ctx.db
            .query('buildingUnits')
            .withIndex('by_buildingId', (q) => q.eq('buildingId', building._id))
            .filter((q) => q.eq(q.field('unitNumber'), unitNumber))
            .first()

          if (!existing) {
            await ctx.db.insert('buildingUnits', {
              buildingId: building._id,
              blockId,
              floor,
              unitNumber,
              type: spec.bhk,
              area: spec.area,
              facing: spec.facing,
              status: 'available',
            })
            insertedCount++
          }
        }
      }
    }

    return { buildingId: building._id, insertedCount }
  },
})
