require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "PioneerClientNitro"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://pioneer.ai"
  s.license      = package["license"]
  s.authors      = "Pioneer Contributors"
  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :path => "." }

  s.prepare_command = "bash scripts/build-rust-ios.sh"

  s.source_files = [
    "ios/**/*.{h,m,mm,swift}",
    "cpp/**/*.{hpp,cpp,h}",
  ]

  load "nitrogen/generated/ios/PioneerClientNitro+autolinking.rb"
  add_nitrogen_files(s)

  s.vendored_frameworks = "rust/ios/PioneerClientFfi.xcframework"
  current_pod_target_xcconfig = s.attributes_hash["pod_target_xcconfig"] || {}
  s.pod_target_xcconfig = current_pod_target_xcconfig.merge({
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
  })

  s.dependency "React-jsi"
  s.dependency "React-callinvoker"
  install_modules_dependencies(s)
end
