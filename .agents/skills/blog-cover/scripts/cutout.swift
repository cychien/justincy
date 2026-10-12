import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation
import Vision

func exitWith(_ message: String) -> Never {
  FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
  exit(1)
}

let arguments = CommandLine.arguments
guard arguments.count >= 4 else { exitWith("Usage: cutout <auto|person|subject> <input> <output.png> [instance,...]") }

let mode = arguments[1]
let input = URL(fileURLWithPath: arguments[2])
let output = URL(fileURLWithPath: arguments[3])
let wanted = arguments.count > 4 ? arguments[4].split(separator: ",").compactMap { Int($0) } : []

guard let image = CIImage(contentsOf: input, options: [.applyOrientationProperty: true]) else {
  exitWith("Cannot read \(input.path)")
}
let handler = VNImageRequestHandler(ciImage: image)

func personMatte() throws -> CIImage {
  let request = VNGeneratePersonSegmentationRequest()
  request.qualityLevel = .accurate
  request.outputPixelFormat = kCVPixelFormatType_OneComponent8
  try handler.perform([request])
  guard let matte = request.results?.first?.pixelBuffer else { exitWith("No person found in \(input.lastPathComponent)") }
  // The matte comes back at a lower resolution; Lanczos keeps its soft hair edges when scaling up.
  let small = CIImage(cvPixelBuffer: matte)
  let scale = image.extent.height / small.extent.height
  let lanczos = CIFilter.lanczosScaleTransform()
  lanczos.inputImage = small
  lanczos.scale = Float(scale)
  lanczos.aspectRatio = Float((image.extent.width / small.extent.width) / scale)
  // Choke the matte: its faint outer fringe carries scraps of whatever stood behind the person.
  let choke = CIFilter.colorMatrix()
  choke.inputImage = lanczos.outputImage!
  let gain = CGFloat(1 / 0.5)
  choke.rVector = CIVector(x: gain, y: 0, z: 0, w: 0)
  choke.gVector = CIVector(x: 0, y: gain, z: 0, w: 0)
  choke.bVector = CIVector(x: 0, y: 0, z: gain, w: 0)
  choke.biasVector = CIVector(x: -0.3 * gain, y: -0.3 * gain, z: -0.3 * gain, w: 0)
  return choke.outputImage!.applyingFilter("CIColorClamp").cropped(to: image.extent)
}

func subjectMask() throws -> (CIImage, String) {
  let request = VNGenerateForegroundInstanceMaskRequest()
  try handler.perform([request])
  guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
    exitWith("No subject found in \(input.lastPathComponent)")
  }
  let available = observation.allInstances.sorted()
  let instances = wanted.isEmpty ? IndexSet(available) : IndexSet(wanted.filter { available.contains($0) })
  if instances.isEmpty { exitWith("No such instance. Available: \(available.map(String.init).joined(separator: ","))") }
  let blocky = CIImage(cvPixelBuffer: try observation.generateScaledMaskForImage(forInstances: instances, from: handler))
  // The instance mask is upscaled in steps, so feather it slightly to hide the staircase edge.
  let feathered = blocky.clampedToExtent().applyingGaussianBlur(sigma: max(1, image.extent.height / 400)).cropped(to: image.extent)
  return (feathered, "instances \(available.map(String.init).joined(separator: ","))")
}

var mask: CIImage
var report = ""
switch mode {
case "person":
  mask = try personMatte()
case "subject":
  (mask, report) = try subjectMask()
case "auto":
  // The person matte has the finer edge but drops what sits in front of the person, such as a
  // microphone. Add back the subject mask shrunk well inside its coarse outline: it fills those
  // objects without bringing its staircase edge, or the slivers of backdrop it clings to.
  let (subject, _) = try subjectMask()
  let shrink = CIFilter.morphologyMinimum()
  shrink.inputImage = subject.clampedToExtent()
  shrink.radius = Float(image.extent.height / 90)
  let inner = shrink.outputImage!.applyingGaussianBlur(sigma: max(1, image.extent.height / 540)).cropped(to: image.extent)
  let union = CIFilter.maximumCompositing()
  union.inputImage = try personMatte()
  union.backgroundImage = inner
  mask = union.outputImage!.cropped(to: image.extent)
default:
  exitWith("Unknown mode \(mode); use auto, person or subject.")
}

let blend = CIFilter.blendWithMask()
blend.inputImage = image
blend.backgroundImage = CIImage.empty()
blend.maskImage = mask
try CIContext().writePNGRepresentation(
  of: blend.outputImage!.cropped(to: image.extent), to: output, format: .RGBA8,
  colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
print(report)
