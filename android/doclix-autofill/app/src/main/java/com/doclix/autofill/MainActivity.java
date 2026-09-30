package com.doclix.autofill;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

public class MainActivity extends Activity {

    private static final String PREFS = "doclix_data_card";

    private SharedPreferences prefs;
    private TextView status;

    private EditText firstName;
    private EditText middleName;
    private EditText lastName;
    private EditText fullName;
    private EditText email;
    private EditText mobile;
    private EditText dob;
    private EditText category;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        status = findViewById(R.id.status);

        firstName = findViewById(R.id.first_name);
        middleName = findViewById(R.id.middle_name);
        lastName = findViewById(R.id.last_name);
        fullName = findViewById(R.id.full_name);
        email = findViewById(R.id.email);
        mobile = findViewById(R.id.mobile);
        dob = findViewById(R.id.dob);
        category = findViewById(R.id.category);

        loadDataCard();

        Button save = findViewById(R.id.save_data);
        save.setOnClickListener(v -> saveDataCard());

        Button enable = findViewById(R.id.enable);
        enable.setOnClickListener(v -> {
            Intent intent =
                    new Intent(Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE);
            intent.setData(
                    Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        });

        updateStatus();
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatus();
    }

    private void loadDataCard() {
        firstName.setText(prefs.getString("first_name", ""));
        middleName.setText(prefs.getString("middle_name", ""));
        lastName.setText(prefs.getString("last_name", ""));
        fullName.setText(prefs.getString("full_name", ""));
        email.setText(prefs.getString("email", ""));
        mobile.setText(prefs.getString("mobile", ""));
        dob.setText(prefs.getString("dob", ""));
        category.setText(prefs.getString("category", ""));
    }

    private void saveDataCard() {
        prefs.edit()
                .putString("first_name",
                        firstName.getText().toString().trim())
                .putString("middle_name",
                        middleName.getText().toString().trim())
                .putString("last_name",
                        lastName.getText().toString().trim())
                .putString("full_name",
                        fullName.getText().toString().trim())
                .putString("email",
                        email.getText().toString().trim())
                .putString("mobile",
                        mobile.getText().toString().trim())
                .putString("dob",
                        dob.getText().toString().trim())
                .putString("category",
                        category.getText().toString().trim())
                .apply();

        status.setText(R.string.data_card_saved);
    }

    private void updateStatus() {
        String service = Settings.Secure.getString(
                getContentResolver(),
                "autofill_service");

        boolean enabled =
                service != null
                        && service.contains(getPackageName());

        status.setText(
                enabled
                        ? R.string.status_enabled
                        : R.string.status_disabled);
    }
}
