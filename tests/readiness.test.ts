import { describe, expect, it } from 'vitest'
import { emptyWorkspace, sampleWorkspace } from '../src/lib/workspace/domain'
import { demoWorkspace } from '../src/lib/workspace/demo'
import { setupSteps } from '../src/lib/workspace/readiness'

describe('Input-based setup progress', () => {
  it('does not mark an empty kitchen or a partly priced inventory as ready', () => {
    expect(setupSteps(emptyWorkspace()).every(step => !step.done)).toBe(true)
    const state = sampleWorkspace('2026-10-14'); state.ingredients[0].price = null
    expect(setupSteps(state).find(step => step.id === 'pricing')?.done).toBe(false)
    state.ingredients[0].price = 0
    expect(setupSteps(state).find(step => step.id === 'pricing')?.done).toBe(true)
  })
  it('requires dated and assigned prep, complete counts and both service phases', () => {
    const state = demoWorkspace()
    expect(setupSteps(state).find(step => step.id === 'prep')?.done).toBe(false)
    state.prep[0] = { ...state.prep[0], assignee: 'Test cook', due: '2026-10-14' }
    expect(setupSteps(state).find(step => step.id === 'prep')?.done).toBe(true)
    state.ingredients[0].stock = null
    expect(setupSteps(state).find(step => step.id === 'counts')?.done).toBe(false)
    state.operations!.routines = state.operations!.routines.filter(routine => routine.phase === 'opening')
    expect(setupSteps(state).find(step => step.id === 'service')?.done).toBe(false)
  })
  it('requires all sold items to have ingredient costs before marking sales setup ready', () => {
    const state = demoWorkspace()
    expect(setupSteps(state).find(step => step.id === 'performance')?.done).toBe(true)
    state.operations!.salesReports[0].rows[0].recipeId = null
    expect(setupSteps(state).find(step => step.id === 'performance')?.done).toBe(false)
  })
})
