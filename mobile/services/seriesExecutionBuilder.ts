import { Routine, WorkoutItem, WorkoutSeries } from '../types'

interface SeriesExecution {
  routine: Routine
  workouts: WorkoutItem[]
}

export function buildSeriesExecution(series: WorkoutSeries, allWorkouts: WorkoutItem[]): SeriesExecution {
  const workoutMap = new Map(allWorkouts.map(w => [w.id, w]))
  const ordered = series.workoutIds
    .map(id => workoutMap.get(id))
    .filter((w): w is WorkoutItem => w !== undefined)

  const routine: Routine = {
    id: `series-${series.id}`,
    name: series.title,
    items: ordered.map((w, i) => ({ workoutItemId: w.id, order: i })),
    createdAt: series.createdAt,
  }

  return { routine, workouts: ordered }
}
