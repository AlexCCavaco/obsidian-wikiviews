import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { readFileSync } from 'fs';
import { InsertTemplate } from "./modal";
import { CreateBody, CreateSidebar, ConvertSidebarEditor, SetupMetaData } from "./templater";
import { join as pathJoin } from 'path';

interface PluginSettings {
	templatePath: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
	templatePath: ''
}

export default class WikiViews extends Plugin {
	settings: PluginSettings;
	templates: Map<string,{
		data:object, body:object, tags:Array<string>, defaultTitle:string, showLinks:boolean,
		categories:{ [key in string]:any }
	}>;

	async onload() {
		await this.loadSettings();
		this.templates = new Map();
		this.templates.set("wb/Nation",require("./templates/worldbuilding/nation.json"));
		this.templates.set("wb/Culture",require("./templates/worldbuilding/culture.json"));
		this.templates.set("wb/Organization",require("./templates/worldbuilding/organization.json"));
		this.templates.set("wb/Title",require("./templates/worldbuilding/title.json"));
		this.templates.set("wb/Religion",require("./templates/worldbuilding/religion.json"));
		this.templates.set("wb/Deity",require("./templates/worldbuilding/deity.json"));
		this.templates.set("wb/Person",require("./templates/worldbuilding/person.json"));
		this.templates.set("wb/Language",require("./templates/worldbuilding/language.json"));
		this.templates.set("wb/Geography",require("./templates/worldbuilding/geography.json"));
		this.templates.set("wb/Settlement",require("./templates/worldbuilding/settlement.json"));
		this.templates.set("wb/Building",require("./templates/worldbuilding/building.json"));
		this.templates.set("wb/Sapient",require("./templates/worldbuilding/sapient.json"));
		this.templates.set("wb/Species",require("./templates/worldbuilding/species.json"));
		this.templates.set("wb/Item",require("./templates/worldbuilding/item.json"));
		this.templates.set("wb/Document",require("./templates/worldbuilding/document.json"));
		this.templates.set("wb/Event",require("./templates/worldbuilding/event.json"));

		this.addCommand({
			id: "open-template-settings",
			name: "Insert Template",
			editorCallback: (editor: Editor) => {

				const onSubmit = async ( templatePathOrKey: string, category: string|null=null, tags: [string]) => {
					let template = this.getTemplate(templatePathOrKey);
					if(!template) return console.error('Template Not Found => '+templatePathOrKey);
					let file = app.workspace.getActiveFile();
					if(!file||!app.metadataCache) return;
					await SetupMetaData(this.app,file,{ type:templatePathOrKey,category:(category??null),tags:(tags??[]) });
					let iData = "";
					iData+= "<div class='wv-title'>"+(template.defaultTitle??"Title")+"</div>" + '\n\n';
					iData+= CreateSidebar(templatePathOrKey,template.data??{},template??{}) + '\n';
					iData+= CreateBody(template.body??{},template??{});
					let content = await this.app.vault.read(file);
					await this.app.vault.modify(file, content+'\n'+iData);
				};

				new InsertTemplate(this.app, this, this.templates, this.settings.templatePath, onSubmit).open();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsTab(this.app, this));

		this.registerMarkdownPostProcessor((element,context)=>{
			//SetupMetaData(this.app);
			let callout = element.querySelector("[data-callout='wv-sidebar']");
			if(!callout||callout.classList.contains('wv-sidebar')) return;
			callout.classList.add('wv-sidebar');
			let templateName = element.getElementsByClassName('callout-title-inner')[0];
			if(!templateName||!templateName.textContent) return;
			let template = this.getTemplate(templateName.textContent);
			if(!template) return console.error('Template Not Found => '+templateName.textContent);
			ConvertSidebarEditor(callout,template.data,template);
		});
	}

	onunload() {
		//
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getTemplate(templatePathOrKey:string){
		let template = this.templates.get(templatePathOrKey);
		if(!template&&this.settings.templatePath!=='') template = JSON.parse(readFileSync(pathJoin(__dirname, this.settings.templatePath, templatePathOrKey),{encoding:'utf8', flag:'r'}));
		return template;
	}
}

class SettingsTab extends PluginSettingTab {
	plugin: WikiViews;

	constructor(app: App, plugin: WikiViews) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'WikiViews Settings'} );

		new Setting(containerEl)
			.setName('Custom Template Folder')
			.setDesc('Folder where Custom Templates for WikiViews are located')
			.addText(text=>text
				.setPlaceholder('/')
				.setValue(this.plugin.settings.templatePath)
				.onChange(async (value)=>{
					this.plugin.settings.templatePath = value;
					await this.plugin.saveSettings();
				}));
	}
}
