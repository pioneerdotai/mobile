#include <fbjni/fbjni.h>
#include <jni.h>

#include "PioneerClientNitroOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    margelo::nitro::pioneer::client::registerAllNatives();
  });
}
