package com.margelo.nitro.pioneer.client

import android.graphics.RectF
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.UIManagerHelper
import java.lang.ref.WeakReference

/** Layout-only companion to the stock RN WebView. No document/native RPC. */
class PioneerHtmlLayoutModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private class Mount(val generation: String, view: WebView) {
        val view = WeakReference(view)
        var cssWidth = 0f
        var rects = emptyList<RectF>()
        var innerGesture = false
        var detach: View.OnAttachStateChangeListener? = null
        fun release() {
            view.get()?.let {
                it.setOnTouchListener(null)
                detach?.let { listener -> it.removeOnAttachStateChangeListener(listener) }
                it.parent?.requestDisallowInterceptTouchEvent(false)
            }
        }
    }
    // Only attached row instances; each is removed on native detach/release.
    private val mounts = HashMap<Int, Mount>()
    @Volatile private var retired = false
    override fun getName() = "PioneerHtmlLayout"

    @ReactMethod
    fun attach(tag: Int, generation: String, promise: Promise) {
        if (generation.isEmpty() || generation.length > 128) { promise.resolve(false); return }
        UiThreadUtil.runOnUiThread {
            try {
                if (retired) { promise.resolve(false); return@runOnUiThread }
                val root = UIManagerHelper.getUIManagerForReactTag(reactApplicationContext, tag)?.resolveView(tag)
                val webview = findWebView(root, 0) ?: run { promise.resolve(false); return@runOnUiThread }
                val previous = mounts[tag]
                previous?.release()
                val mount = Mount(generation, webview)
                mounts[tag] = mount
                webview.setOnTouchListener { view, event ->
                    // Decide before the ancestor ScrollView's first MOVE. Stock
                    // nestedScrollEnabled is false, so it cannot lock the whole
                    // surface. Return false to preserve native DOM input/clicks.
                    if (event.actionMasked == MotionEvent.ACTION_DOWN) {
                        val scale = if (view.width > 0) mount.cssWidth / view.width else 0f
                        mount.innerGesture = scale > 0 && mount.rects.any {
                            it.contains(event.x * scale, event.y * scale)
                        }
                    }
                    val terminal = event.actionMasked == MotionEvent.ACTION_UP || event.actionMasked == MotionEvent.ACTION_CANCEL
                    view.parent?.requestDisallowInterceptTouchEvent(!terminal && mount.innerGesture)
                    if (terminal) mount.innerGesture = false
                    false
                }
                val detach = object : View.OnAttachStateChangeListener {
                    override fun onViewAttachedToWindow(view: View) = Unit
                    override fun onViewDetachedFromWindow(view: View) {
                        if (mounts[tag] === mount) mounts.remove(tag)
                        view.setOnTouchListener(null)
                        view.parent?.requestDisallowInterceptTouchEvent(false)
                        view.removeOnAttachStateChangeListener(this)
                    }
                }
                mount.detach = detach
                webview.addOnAttachStateChangeListener(detach)
                promise.resolve(true)
            } catch (_: Exception) { promise.resolve(false) }
        }
    }

    @ReactMethod
    fun update(tag: Int, generation: String, width: Double, rectangles: ReadableArray) {
        if (!width.isFinite() || width <= 0 || width > Float.MAX_VALUE || rectangles.size() > 64) return
        val rects = ArrayList<RectF>(rectangles.size())
        for (index in 0 until rectangles.size()) {
            if (rectangles.getType(index) != ReadableType.Array) return
            val rect = rectangles.getArray(index) ?: return
            if (rect.size() != 4 || (0..3).any { rect.getType(it) != ReadableType.Number }) return
            val values = (0..3).map { rect.getDouble(it) }
            if (values.any { !it.isFinite() || it < 0 || it > Float.MAX_VALUE } || values[2] > width || values[2] <= values[0] || values[3] <= values[1]) return
            rects.add(RectF(values[0].toFloat(), values[1].toFloat(), values[2].toFloat(), values[3].toFloat()))
        }
        UiThreadUtil.runOnUiThread {
            mounts[tag]?.takeIf { it.generation == generation }?.let {
                it.cssWidth = width.toFloat()
                it.rects = rects
            }
        }
    }

    @ReactMethod
    fun release(tag: Int, generation: String) {
        UiThreadUtil.runOnUiThread {
            mounts[tag]?.takeIf { it.generation == generation }?.let {
                mounts.remove(tag)
                it.release()
            }
        }
    }

    // The existing RN WebView renders View -> wrapper -> WebView under our
    // non-collapsible row host. Bounded lookup, no private fields/reflection.
    private fun findWebView(view: View?, depth: Int): WebView? {
        if (view is WebView) return view
        if (view !is ViewGroup || depth >= 4 || view.childCount > 8) return null
        for (index in 0 until view.childCount) findWebView(view.getChildAt(index), depth + 1)?.let { return it }
        return null
    }

    override fun invalidate() {
        retired = true
        UiThreadUtil.runOnUiThread {
            mounts.values.forEach { it.release() }
            mounts.clear()
        }
        super.invalidate()
    }
}
