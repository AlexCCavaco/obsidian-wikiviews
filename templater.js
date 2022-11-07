import { stringifyYaml,parseYaml } from "obsidian";

export function CreateBody(data,opts={},header=1){
	let res = "";
	let keys = Object.keys(data);
	for(let key of keys){
		let keyedData = data[key];
		let label = keyedData.label??key;
		let code = keyedData.code??label.toLowerCase().replace(' ','-');
		res+= '<h'+header+' data-code=\"'+code+'\">'+label+'</h'+header+'>\n';
		if(keyedData.prompt) res+= '<!-- [prompt] '+keyedData.prompt+' -->\n';
		if(keyedData.placeholder) res+= ">"+" "+keyedData.placeholder+"\n";
		res+= "\n";
		if(keyedData.list) res+= CreateBody(keyedData.list,opts,header+1);
	}
	return res;
}

export function CreateSidebar(templateName,data,opts={}){
	let res = "> [!wv-sidebar]- "+templateName+"\n";
	let keys = Object.keys(data);
	for(let key of keys){
		let keyedData = data[key];
		res+= "> \""+key+"\": "+(keyedData.placeholder?stringifyYaml(keyedData.placeholder):'\"\"')+"\n";
	}
	return res;
}

export function ConvertSidebarEditor(callout,templateInfo,opts={}){
	let html = callout.getElementsByClassName('callout-content')[0];
	html = html.innerHTML.replace(/(<(?![\/]?(a|span)[\s>])([^>]+)>)/ig,'');
	let templateData = parseYaml(html);
	let tbl = document.createElement('table');
	let tbody = document.createElement('tbody');
	tbl.appendChild(tbody);
	callout.innerHTML = '';
	callout.appendChild(tbl);
	tbl.classList.add('wv-table');
	let keys = Object.keys(templateData);
	for(let key of keys){
		let keyData = templateData[key];
		let keyInfo = templateInfo[key];
		let label = keyInfo?(keyInfo.label??key):key;
		tbody.innerHTML+= handleDataVal(label,keyData,keyInfo??{});
	}
}
function makeRow(label,data,joined=false,opts={}){
	if(!opts.classes) opts.classes = [];
	if(opts.bold) opts.classes.push('wv-bold');
	if(opts.title) opts.classes.push('wv-ttl');
	if(opts.wide) return "<tr class='wv-row wv-full "+opts.classes.join(' ')+""+(opts.joined?' wv-row-joined':'')+"'>"+
		"<td class='wv-cell"
		+(opts.thinLabel?'':' wv-head')+"'>"
		+(label?"<span class='wv-label'>"+label+":</span> ":"")
		+data+"</td>"+
		"</tr>";
	return "<tr class='wv-row "+opts.classes.join(' ')+""+(joined||opts.joined?' wv-row-joined':'')+"'>"+
		"<td class='wv-cell wv-cell-main"
		+(opts.thinLabel?'':' wv-head')+"'>"+label+"</td>"+
		"<td class='wv-cell'>"+data+"</td>"+
		"</tr>";
}
function getCellData(data,opts={}){
	let out = [];
	if(Array.isArray(data)) return "<span class='wv-name'>"+data.join(', ')+"</span>";
	if(opts.preText) out.push("<span class='wv-text'>"+data.preText+"</span>");
	if(typeof data === 'string'){
		out.push("<span class='wv-name'>"+data+"</span>")
	} else {
		if(data.icon) out.push("<span class='wv-icon'>"+data.icon+"</span>");
		if(data.percentage) out.push("<span class='wv-perc'>"+data.percentage+"</span>");
		if(data.date) out.push("<span class='wv-date'>"+data.date+"</span>");
		if(data.value) out.push("<span class='wv-value'>"+data.value+"</span>");
		if(data.name) out.push("<span class='wv-name'>"+data.name+"</span>");
		if(data.info) out.push("<span class='wv-info'>"+data.info+"</span>");
	}
	if(opts.postText) out.push("<span class='wv-text'>"+data.postText+"</span>");
	if(data.underText) out.push("<span class='wv-utext'>"+data.underText+"</span>");
	return out.join(' ');
}
function handleDataVal(name,data,opts={}){
	if(!data) return '';
	let tblQ = "";
	let joined = !name;
	if(Array.isArray(data)){
		let nm = name;
		for(let ie of data){
			tblQ+= handleDataVal(nm,ie);
			nm = '';
		}
	}
	else if(typeof data === 'string') tblQ+= makeRow(name,data,joined,opts);
	else {
		if(opts.wide&&opts.thinLabel===undefined) opts.thinLabel = true;
		if(!opts.wide&&data.label){
			if(name) tblQ+= makeRow(name,'',false,opts);
			name = data.label;
			joined = true;
			opts.thinLabel = true;
		}

		let cellData = "";
		if(opts.list||data.list){
			cellData+= "<ul class='wv-elm'>";
			for(let dt of data.list??data) cellData+= "<li class='wv-elm'>"+getCellData(dt,opts)+"</li>";
			cellData+= "</ul>";
		} else if(opts.group||data.group){
			for(let dt of data.group??data) cellData+= "<span class='wv-elm'>"+getCellData(dt,opts)+"</span>";
		} else {
			cellData = getCellData(data,opts);
		}

		if(cellData) tblQ+= makeRow(name,cellData,joined,opts);
	}
	return tblQ;
}

let wvMetadataFields = [ 'wv-type','wv-category','wv-links' ];
export function SetupMetaData(app){
	let file = app.workspace.getActiveFile();
	if(!file) return;
	let metaData = app.metadata.getFileCache(file);
	if(!metaData||!metaData.frontmatter) return;
	const {
		"wv-type": type,
		"wv-category": category,
		"wv-links": links
	} = metaData.frontmatter;
}
export async function AddMetaData(app){
	let file = app.workspace.getActiveFile();
	if(!file) return;
	const { frontmatter: { position, ...fields }} = this.metadata.getFileCache(file);
	const frontKeys = Object.keys(fields ?? {});
	if (!fields || !wvMetadataFields.some(f=>frontKeys.includes(f))) { return }
	/*/*/
	const content = await app.vault.read(file);
	const lines = content.split('\n');
	const { line: start } = position.start;
	let { line: end } = position.end;
	/*/*/
	if (frontKeys.every(f => wvMetadataFields.includes(f))) {
		lines.splice(start, end - start + 1);
	} else {
		// Iterate through each YAML field-line `and remove the desired ones
		for (let i = start + 1; i < end && wvMetadataFields.length; i++) {
			const [key] = lines[i].split(': ');
			const fieldIndex = wvMetadataFields.indexOf(key);
			if (fieldIndex === -1) { continue }

			lines.splice(i, 1);
			wvMetadataFields.splice(fieldIndex, 1);
			i--;
			end--;
		}
		const newContent = lines.join('\n');
		await this.vault.modify(file, newContent);
	}
}
