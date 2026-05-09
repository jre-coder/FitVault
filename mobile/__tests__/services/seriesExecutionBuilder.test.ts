import { buildSeriesExecution } from '../../services/seriesExecutionBuilder'
import { WorkoutItem, WorkoutSeries } from '../../types'

const series: WorkoutSeries = {
  id: 'series-1',
  title: 'Jeff Nippard PPL',
  workoutIds: ['w1', 'w2', 'w3'],
  createdAt: '2026-05-09T00:00:00Z',
}

const workout1: WorkoutItem = {
  id: 'w1', title: 'PPL Part 1 - Push', url: 'https://youtube.com/1',
  sourceType: 'youtube', bodyParts: ['Chest'], notes: '', dateAdded: '', isFavorite: false,
  exercises: [{ name: 'Bench Press', sets: 4, reps: '8' }],
}

const workout2: WorkoutItem = {
  id: 'w2', title: 'PPL Part 2 - Pull', url: 'https://youtube.com/2',
  sourceType: 'youtube', bodyParts: ['Back'], notes: '', dateAdded: '', isFavorite: false,
  exercises: [{ name: 'Pull Up', sets: 3, reps: '10' }],
}

const workout3: WorkoutItem = {
  id: 'w3', title: 'PPL Part 3 - Legs', url: 'https://youtube.com/3',
  sourceType: 'youtube', bodyParts: ['Legs'], notes: '', dateAdded: '', isFavorite: false,
}

const allWorkouts = [workout1, workout2, workout3]

describe('buildSeriesExecution', () => {
  it('returns a routine named after the series', () => {
    const { routine } = buildSeriesExecution(series, allWorkouts)
    expect(routine.name).toBe('Jeff Nippard PPL')
  })

  it('routine items are ordered by series workoutIds order', () => {
    const { routine } = buildSeriesExecution(series, allWorkouts)
    expect(routine.items.map(i => i.workoutItemId)).toEqual(['w1', 'w2', 'w3'])
  })

  it('routine item order values are sequential from 0', () => {
    const { routine } = buildSeriesExecution(series, allWorkouts)
    expect(routine.items.map(i => i.order)).toEqual([0, 1, 2])
  })

  it('workouts array contains WorkoutItems in series order', () => {
    const { workouts } = buildSeriesExecution(series, allWorkouts)
    expect(workouts.map(w => w.id)).toEqual(['w1', 'w2', 'w3'])
  })

  it('skips workoutIds that are not in the provided workouts list', () => {
    const { routine, workouts } = buildSeriesExecution(series, [workout1, workout3])
    expect(workouts.map(w => w.id)).toEqual(['w1', 'w3'])
    expect(routine.items).toHaveLength(2)
  })

  it('returns empty workouts and routine items for empty series', () => {
    const emptySeries: WorkoutSeries = { id: 'e', title: 'Empty', workoutIds: [], createdAt: '' }
    const { routine, workouts } = buildSeriesExecution(emptySeries, allWorkouts)
    expect(workouts).toHaveLength(0)
    expect(routine.items).toHaveLength(0)
  })
})
