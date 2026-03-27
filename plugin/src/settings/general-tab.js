const { Setting } = require("obsidian");

function display(containerEl) {
  containerEl.createEl("h2", { text: "Ignis General Settings" });

  new Setting(containerEl)
    .setName("Example toggle")
    .setDesc("This is a test toggle to prove the Setting API works.")
    .addToggle((toggle) => {
      toggle.setValue(false);
      toggle.onChange((value) => {
        console.log("[ignis] Toggle:", value);
      });
    });
}

module.exports = { display };
