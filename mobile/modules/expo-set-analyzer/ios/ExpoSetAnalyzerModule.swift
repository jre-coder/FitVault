import ExpoModulesCore
import Vision
import AVFoundation
import CoreImage
import UIKit

public class ExpoSetAnalyzerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoSetAnalyzer")

    AsyncFunction("analyzeVideo") { (videoPath: String, promise: Promise) in
      Task {
        do {
          let result = try await Self.analyze(videoPath: videoPath)
          promise.resolve(result)
        } catch {
          promise.reject("ANALYSIS_FAILED", error.localizedDescription)
        }
      }
    }
  }

  // MARK: - Analysis

  private static func analyze(videoPath: String) async throws -> [String: Any] {
    let url = URL(fileURLWithPath: videoPath)
    let asset = AVAsset(url: url)

    let duration = try await asset.load(.duration)
    let durationSeconds = CMTimeGetSeconds(duration)
    guard durationSeconds > 0 else {
      return emptyResult()
    }

    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.requestedTimeToleranceBefore = CMTime(seconds: 0.05, preferredTimescale: 600)
    generator.requestedTimeToleranceAfter  = CMTime(seconds: 0.05, preferredTimescale: 600)

    // Sample at 10 fps
    let sampleInterval = 0.1
    var frames: [RepDetector.AngleFrame] = []
    var t = 0.0
    while t <= durationSeconds {
      let time = CMTime(seconds: t, preferredTimescale: 600)
      if let cgImage = try? generator.copyCGImage(at: time, actualTime: nil),
         let angle = detectPrimaryAngle(in: cgImage) {
        frames.append(.init(timestamp: t, angle: angle))
      }
      t += sampleInterval
    }

    let reps = RepDetector.detectReps(from: frames)

    return [
      "frameCount": frames.count,
      "jointAngles": frames.map { ["timestamp": $0.timestamp, "angle": $0.angle, "confidence": 1.0] },
      "repCount": reps.count,
      "repTimestamps": reps.map { ["start": $0.start, "end": $0.end] },
      "primaryJoint": "auto",
    ]
  }

  // MARK: - Joint angle detection

  private static func detectPrimaryAngle(in image: CGImage) -> Double? {
    // Run body pose detection
    let request = VNDetectHumanBodyPoseRequest()
    let handler = VNImageRequestHandler(cgImage: image, options: [:])
    try? handler.perform([request])
    guard let obs = request.results?.first else { return nil }

    // Try joints in priority order: right elbow, left elbow, right knee, left knee.
    // Use whichever triple has the highest minimum confidence.
    let candidates: [(a: VNHumanBodyPoseObservation.JointName,
                      b: VNHumanBodyPoseObservation.JointName,
                      c: VNHumanBodyPoseObservation.JointName)] = [
      (.rightShoulder, .rightElbow, .rightWrist),
      (.leftShoulder,  .leftElbow,  .leftWrist),
      (.rightHip,      .rightKnee,  .rightAnkle),
      (.leftHip,       .leftKnee,   .leftAnkle),
    ]

    var bestAngle: Double? = nil
    var bestConfidence = 0.0

    for (aName, bName, cName) in candidates {
      guard
        let ptA = try? obs.recognizedPoint(aName),
        let ptB = try? obs.recognizedPoint(bName),
        let ptC = try? obs.recognizedPoint(cName)
      else { continue }

      let minConf = Double(min(ptA.confidence, ptB.confidence, ptC.confidence))
      guard minConf > 0.3 else { continue }

      if minConf > bestConfidence {
        bestConfidence = minConf
        bestAngle = angle(
          a: CGPoint(x: ptA.location.x, y: ptA.location.y),
          b: CGPoint(x: ptB.location.x, y: ptB.location.y),
          c: CGPoint(x: ptC.location.x, y: ptC.location.y)
        )
      }
    }

    return bestAngle
  }

  // Angle at point b formed by rays b→a and b→c, in degrees.
  private static func angle(a: CGPoint, b: CGPoint, c: CGPoint) -> Double {
    let ba = CGPoint(x: a.x - b.x, y: a.y - b.y)
    let bc = CGPoint(x: c.x - b.x, y: c.y - b.y)
    let dot   = ba.x * bc.x + ba.y * bc.y
    let cross = ba.x * bc.y - ba.y * bc.x
    return abs(atan2(Double(cross), Double(dot))) * 180.0 / .pi
  }

  private static func emptyResult() -> [String: Any] {
    return [
      "frameCount": 0,
      "jointAngles": [] as [[String: Any]],
      "repCount": 0,
      "repTimestamps": [] as [[String: Any]],
      "primaryJoint": "none",
    ]
  }
}
