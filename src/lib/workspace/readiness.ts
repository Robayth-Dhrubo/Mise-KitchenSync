import { businessTotals } from './business'
import { costRecipe, unitCost, type Workspace } from './domain'

export function setupSteps(state: Workspace) {
  return [
    { id: 'kitchen', title: 'Name your kitchen', detail: 'Confirm the workspace name and food-cost target.', view: 'settings', done: state.settings.kitchenName !== 'My kitchen' },
    { id: 'suppliers', title: 'Add your suppliers', detail: 'Keep order contacts and delivery days together.', view: 'suppliers', done: state.suppliers.length > 0 },
    { id: 'pricing', title: 'Enter purchase prices', detail: 'Add a full pack price, pack quantity and usable yield.', view: 'inventory', done: state.ingredients.length > 0 && state.ingredients.every(ingredient => unitCost(ingredient) !== null) },
    { id: 'counts', title: 'Count stock and choose pars', detail: 'Confirm every stock count and target to enable order suggestions.', view: 'inventory', done: state.ingredients.length > 0 && state.ingredients.every(ingredient => ingredient.stock !== null && ingredient.par !== null) },
    { id: 'recipes', title: 'Cost your first complete recipe', detail: 'Include all ingredients and measure the portions produced.', view: 'recipes', done: state.recipes.some(recipe => costRecipe(recipe, state.ingredients, state.settings.targetFoodCost).status !== 'incomplete') },
    { id: 'prep', title: 'Assign the next service’s prep', detail: 'Give a task a station, person, quantity and date.', view: 'prep', done: state.prep.some(task => !!task.due && !!task.assignee && !!task.quantity && !!task.station) },
    { id: 'service', title: 'Build your daily checks', detail: 'Adapt the opening and closing routine to your kitchen.', view: 'service', done: ['opening', 'closing'].every(phase => state.operations?.routines.some(routine => routine.active && routine.phase === phase)) },
    { id: 'schedule', title: 'Plan a dated staff shift', detail: 'Add an employee and a shift with a confirmed hourly rate.', view: 'schedule', done: !!state.operations?.shifts.some(shift => shift.hourlyRate !== null) },
    { id: 'performance', title: 'Connect sales to recipe costs', detail: 'Save a dated report and link every sold item to a costed recipe.', view: 'performance', done: !!state.operations?.salesReports.some(report => report.rows.some(row => row.quantity > 0) && report.rows.filter(row => row.quantity > 0).every(row => { const recipe = state.recipes.find(recipe => recipe.id === row.recipeId); return !!recipe && costRecipe(recipe, state.ingredients).portionCost !== null })) },
    { id: 'budget', title: 'Complete the hiring budget', detail: 'Include wages, employer costs, overtime and recruitment.', view: 'budget', done: !!state.business && businessTotals(state.business).hiringBudget !== null },
  ] as const
}
