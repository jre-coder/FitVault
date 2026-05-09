import Foundation
import Vision

/// Tracks joint angle over time and detects rep cycles.
struct RepDetector {

  // A rep = one full cycle where the angle goes through a range of at least `minRange` degrees.
  // We look for the "direction reversal" pattern: angle decreases through a range, then increases
  // back (or vice versa). Each full round-trip = 1 rep.

  private static let minRangeForRep: Double = 20.0
  private static let smoothingWindow = 3

  struct RepInterval {
    let start: Double   // seconds
    let end: Double     // seconds
  }

  struct AngleFrame {
    let timestamp: Double
    let angle: Double
  }

  static func detectReps(from frames: [AngleFrame]) -> [RepInterval] {
    guard frames.count > 10 else { return [] }

    let smoothed = smooth(frames.map { $0.angle }, window: smoothingWindow)
    let timestamps = frames.map { $0.timestamp }

    let range = (smoothed.max() ?? 0) - (smoothed.min() ?? 0)
    guard range >= minRangeForRep else { return [] }

    // Find direction reversals (local peaks and valleys)
    var reversals: [(timestamp: Double, angle: Double)] = []
    for i in 1..<smoothed.count - 1 {
      let prev = smoothed[i - 1]
      let curr = smoothed[i]
      let next = smoothed[i + 1]
      if (curr > prev && curr >= next) || (curr < prev && curr <= next) {
        reversals.append((timestamps[i], curr))
      }
    }

    guard reversals.count >= 2 else { return [] }

    // Each pair of consecutive reversals (valley→peak or peak→valley) that spans ≥ minRange = 1 rep.
    // We pair them as half-reps; a full rep = 2 half-reps.
    var reps: [RepInterval] = []
    var i = 0
    while i + 1 < reversals.count {
      let a = reversals[i]
      let b = reversals[i + 1]
      let span = abs(b.angle - a.angle)
      if span >= minRangeForRep * 0.7 {
        // Look for the closing half: next reversal back toward a
        if i + 2 < reversals.count {
          let c = reversals[i + 2]
          let spanBack = abs(c.angle - b.angle)
          if spanBack >= minRangeForRep * 0.7 {
            reps.append(RepInterval(start: a.timestamp, end: c.timestamp))
            i += 2
            continue
          }
        }
      }
      i += 1
    }

    return reps
  }

  private static func smooth(_ values: [Double], window: Int) -> [Double] {
    let half = window / 2
    return values.indices.map { i in
      let lo = max(0, i - half)
      let hi = min(values.count - 1, i + half)
      let slice = values[lo...hi]
      return slice.reduce(0, +) / Double(slice.count)
    }
  }
}
