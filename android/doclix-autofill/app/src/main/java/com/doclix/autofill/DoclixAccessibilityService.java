package com.doclix.autofill;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.content.SharedPreferences;
import android.text.TextUtils;

import java.util.Locale;

public class DoclixAccessibilityService extends AccessibilityService {
    private static final String PREFS = "doclix_data_card";
    private static final String DIAG = "doclix_autofill_diag";
    private static final long MIN_ACTION_GAP_MS = 250L;
    private long lastActionAt = 0L;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        getSharedPreferences(DIAG, MODE_PRIVATE).edit()
                .putBoolean("accessibility_enabled", true)
                .apply();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;
        if (!"com.android.chrome".contentEquals(event.getPackageName())) return;

        if (event.getEventType() != AccessibilityEvent.TYPE_VIEW_FOCUSED
                && event.getEventType() != AccessibilityEvent.TYPE_VIEW_CLICKED) {
            return;
        }

        AccessibilityNodeInfo node = event.getSource();
        if (node == null) return;

        long now = System.currentTimeMillis();
        if (now - lastActionAt < MIN_ACTION_GAP_MS) return;

        String type = classify(node);
        if (type.isEmpty()) return;

        String value = getSharedPreferences(PREFS, MODE_PRIVATE)
                .getString(type, "");
        if (TextUtils.isEmpty(value)) return;

        // Never overwrite non-empty user input.
        CharSequence current = node.getText();
        if (current != null && current.length() > 0
                && !node.isShowingHintText()) {
            return;
        }

        boolean editable = node.isEditable();
        if (!editable) {
            // Chrome web nodes sometimes do not expose isEditable reliably.
            // ACTION_SET_TEXT itself is the final capability check.
        }

        android.os.Bundle args = new android.os.Bundle();
        args.putCharSequence(
                AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                value);

        boolean filled = node.performAction(
                AccessibilityNodeInfo.ACTION_SET_TEXT, args);

        lastActionAt = now;
        getSharedPreferences(DIAG, MODE_PRIVATE).edit()
                .putInt("accessibility_fills",
                        getSharedPreferences(DIAG, MODE_PRIVATE)
                                .getInt("accessibility_fills", 0) + (filled ? 1 : 0))
                .putString("accessibility_last_type", type)
                .putBoolean("accessibility_last_result", filled)
                .apply();

        node.recycle();
    }

    private String classify(AccessibilityNodeInfo node) {
        StringBuilder all = new StringBuilder();
        append(all, node.getViewIdResourceName());
        append(all, node.getHintText());
        append(all, node.getContentDescription());
        append(all, node.getText());

        AccessibilityNodeInfo parent = node.getParent();
        for (int i = 0; parent != null && i < 4; i++) {
            append(all, parent.getViewIdResourceName());
            append(all, parent.getHintText());
            append(all, parent.getContentDescription());
            append(all, parent.getText());
            parent = parent.getParent();
        }

        String s = all.toString().toLowerCase(Locale.ROOT);

        if (s.contains("middle name") || s.contains("middlename")) return "middle_name";
        if (s.contains("first name") || s.contains("firstname")) return "first_name";
        if (s.contains("last name") || s.contains("lastname")
                || s.contains("surname")) return "last_name";
        if (s.contains("full name") || s.contains("fullname")) return "full_name";
        if (s.contains("email")) return "email";
        if (s.contains("mobile") || s.contains("phone") || s.contains("telephone")
                || s.contains("tel")) return "mobile";
        if (s.contains("date of birth") || s.contains("birth date")
                || s.contains("dob")) return "dob";
        if (s.contains("category") || s.contains("caste")) return "category";

        return "";
    }

    private void append(StringBuilder b, CharSequence value) {
        if (value != null) b.append(' ').append(value);
    }

    @Override
    public void onInterrupt() {
        getSharedPreferences(DIAG, MODE_PRIVATE)
                .edit().putBoolean("accessibility_enabled", false).apply();
    }
}
