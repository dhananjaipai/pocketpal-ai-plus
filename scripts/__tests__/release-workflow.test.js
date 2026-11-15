const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf-8');

const workflow = read('.github/workflows/release.yml');
const fastfile = read('android/fastlane/Fastfile');
const androidBuild = read('android/app/build.gradle');

describe('GitHub release workflow', () => {
  it('runs on pushes to main', () => {
    expect(workflow).toMatch(/^\s{2}push:\n\s{4}branches:\n\s{6}- main$/m);
    expect(workflow).toMatch(/^\s{2}workflow_dispatch:$/m);
    expect(workflow).toMatch(/^\s{4}if: github\.ref == 'refs\/heads\/main'$/m);
  });

  it('builds the APK with Plus unlocked by default', () => {
    expect(workflow).toMatch(/^\s{6}PLUS_STORE_GATE: 'false'$/m);
    expect(workflow).toMatch(/bundle exec fastlane build_android_apk/);
    expect(workflow).not.toMatch(/verify-plus-gate/);
  });

  it('uses an increasing Android version code for each workflow run', () => {
    expect(workflow).toMatch(/160 \+ GITHUB_RUN_NUMBER/);
    expect(androidBuild).toMatch(/findProperty\("appVersionCode"\)/);
  });

  it('publishes only the APK to a commit-specific GitHub release', () => {
    expect(workflow).toMatch(/tag_name: "main-\$\{\{ github\.sha \}\}"/);
    expect(workflow).toMatch(
      /files: android\/app\/build\/outputs\/apk\/prod\/release\/app-prod-release\.apk/,
    );
    expect(workflow).not.toMatch(
      /\.aab|upload_to_play_store|testflight|upload-artifact/,
    );
  });

  it('has no Android app-bundle or Play Store lanes', () => {
    expect(fastfile).toMatch(/lane :build_android_apk do/);
    expect(fastfile).not.toMatch(
      /build_android_aab|upload_android_alpha|upload_to_play_store/,
    );
  });
});
