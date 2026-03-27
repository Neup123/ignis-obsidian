const { Setting } = require("obsidian");

function display(containerEl) {
  containerEl.createEl("h2", { text: "Server Plugins" });

  new Setting(containerEl)
    .setName("Example text input")
    .setDesc("This is a test input to prove a second tab works.")
    .addText((text) => {
      text.setPlaceholder("Type something...");
    });
}

module.exports = { display };
