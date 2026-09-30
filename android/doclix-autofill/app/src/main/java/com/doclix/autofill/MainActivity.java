package com.doclix.autofill;

import android.app.Activity;
import android.os.Bundle;
import android.provider.Settings;
import android.content.Intent;
import android.widget.Button;
import android.widget.TextView;

public class MainActivity extends Activity {
    private TextView status;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        status = findViewById(R.id.status);
        Button enable = findViewById(R.id.enable);
        enable.setOnClickListener(v -> {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE);
            intent.setData(android.net.Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        });
        updateStatus();
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatus();
    }

    private void updateStatus() {
        String service = Settings.Secure.getString(getContentResolver(), "autofill_service");
        boolean enabled = service != null && service.contains(getPackageName());
        status.setText(enabled ? getString(R.string.status_enabled) : getString(R.string.status_disabled));
    }
}
