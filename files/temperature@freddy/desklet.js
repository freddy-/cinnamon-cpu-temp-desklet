const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const Settings = imports.ui.settings;
const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;
const Gettext = imports.gettext;
const Util = imports.misc.util;
const uuid = "temperature@freddy";

Gettext.bindtextdomain(uuid, GLib.get_home_dir() + "/.local/share/locale");

function _(str) {
  return Gettext.dgettext(uuid, str);
}

function TheDesklet(metadata, desklet_id) {
  this._init(metadata, desklet_id);
}

TheDesklet.prototype = {
  __proto__: Desklet.Desklet.prototype,

  _init: function(metadata, desklet_id) {
    Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);

    this.settings = new Settings.DeskletSettings(
      this,
      this.metadata.uuid,
      desklet_id
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "height",
      "height",
      this.on_setting_changed,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "width",
      "width",
      this.on_setting_changed,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "refresh-rate",
      "refresh_rate",
      this.on_setting_changed,
      null
    );

    this.refresh_rate = 1;
    this.temperatures = ["0", "0", "0", "0"];
    this.metadata["prevent-decorations"] = true;
    this._updateDecoration();
    this.get_temperatures();
  },

  on_setting_changed() {
    this.metadata["prevent-decorations"] = true;
    this._updateDecoration();
    this.window.set_size(this.width, this.height);
  },

  on_desklet_removed: function() {
    this.window.destroy_all_children();
    this.window.destroy();
    Mainloop.source_remove(this.mainloop);
  },

  setup_ui: function() {
    this.window = new St.BoxLayout({
      vertical: true,
      width: this.width,
      height: this.height,
      style_class: "temp-box"
    });

    this.temperatures.forEach(
      Lang.bind(this, function(element, index) {
        this.text1 = new St.Label({ style_class: "text-label"});
        this.text1.set_text("Core " + (index + 1) + ":  " + element + "°C");
        this.window.add(this.text1);
      })
    );

    this.setContent(this.window);
    this.mainloop = Mainloop.timeout_add(
      this.refresh_rate * 1000,
      Lang.bind(this, this.get_temperatures)
    );
  },

  get_temperatures: function() {
    Util.spawnCommandLineAsyncIO("sensors", Lang.bind(this, this.sensors_cb));
  },

  sensors_cb: function(stdout, stderr, exitCode) {
    var temperatures = [];
    var myRegexp = /Core \d: +\+(\d+)/gm;
    var match = myRegexp.exec(stdout);
    while (match != null) {
      temperatures.push(match[1]);
      match = myRegexp.exec(stdout);
    }
    this.temperatures = temperatures;
    this.setup_ui();
  }
};

function main(metadata, desklet_id) {
  return new TheDesklet(metadata, desklet_id);
}
