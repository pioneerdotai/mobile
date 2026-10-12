package com.margelo.nitro.pioneer.client

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class PioneerClientNitroPackage : BaseReactPackage() {
    override fun getModule(
        name: String,
        reactContext: ReactApplicationContext,
    ): NativeModule? = if (name == "PioneerHtmlLayout") PioneerHtmlLayoutModule(reactContext) else null

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            hashMapOf("PioneerHtmlLayout" to ReactModuleInfo(
                "PioneerHtmlLayout", PioneerHtmlLayoutModule::class.java.name,
                false, false, false, false,
            ))
        }
    }

    companion object {
        init {
            PioneerClientNitroOnLoad.initializeNative()
        }
    }
}
