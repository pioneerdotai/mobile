project(PioneerClientNitro)
cmake_minimum_required(VERSION 3.9.0)

set(PACKAGE_NAME PioneerClientNitro)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

add_library(${PACKAGE_NAME} SHARED
  src/main/cpp/cpp-adapter.cpp
  ../cpp/HybridPioneerClient.cpp
)

include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/PioneerClientNitro+autolinking.cmake)

include_directories(
  "src/main/cpp"
  "../cpp"
)

set(PIONEER_CLIENT_FFI_LIBRARY "${CMAKE_SOURCE_DIR}/../rust/android/${ANDROID_ABI}/libpioneer_client_ffi.so")
if(NOT EXISTS "${PIONEER_CLIENT_FFI_LIBRARY}")
  message(FATAL_ERROR "Missing ${PIONEER_CLIENT_FFI_LIBRARY}. Run scripts/build-rust-android.sh before building Android.")
endif()

add_library(pioneer_client_ffi SHARED IMPORTED)
set_target_properties(
  pioneer_client_ffi
  PROPERTIES
  IMPORTED_LOCATION "${PIONEER_CLIENT_FFI_LIBRARY}"
  IMPORTED_SONAME "libpioneer_client_ffi.so"
)

find_library(LOG_LIB log)

target_link_libraries(
  ${PACKAGE_NAME}
  ${LOG_LIB}
  android
  pioneer_client_ffi
)
