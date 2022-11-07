import { stringifyYaml,parseYaml } from "obsidian";
import { stripIndents } from 'common-tags';

export function CreateBody(data,opts={},header=1){
	let res = "";
	let keys = Object.keys(data);
	if(data._main&&data._main.prompt) res+= '<!-- [prompt] '+data._main.prompt+' -->\n';
	for(let key of keys){
		if(key==='_main') continue;
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
	let linkData = {};//TODO
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

export async function GetMetaData(app,file=null){
	if(!file) file = app.workspace.getActiveFile();
	if(!file||!app.metadataCache) return;
	let metaData = app.metadataCache.getFileCache(file);
	if(!metaData||!metaData.frontmatter) return;
	const {
		wv_type: type,
		wv_category: category,
		wv_tags: tags,
		wv_data: data
	} = metaData.frontmatter;
	return { type,category,tags,data };
}
export async function SetupMetaData(app,file,addMeta={}){
	if(!file) file = app.workspace.getActiveFile();
	if(!file||!app.metadataCache) return;
	let metaData = await GetMetaData(app);
	let insertMeta = {};
	if(!metaData) return await AddMetaData(app,file,addMeta);
	if((!metaData.type && addMeta.type) || metaData.type!==(addMeta.type??'')) insertMeta.type = addMeta.type;
	if((!metaData.category && addMeta.category) || metaData.category!==(addMeta.category??'')) insertMeta.category = addMeta.category;
	if((!metaData.tags && addMeta.tags) || metaData.tags.length!==(addMeta.tags??[]).length || !addMeta.every(el=>metaData.tags.includes(el))) insertMeta.tags = addMeta.tags;
	if((!metaData.data && addMeta.data) || JSON.stringify(metaData.data) === JSON.stringify(addMeta.data??{})) insertMeta.data = addMeta.data;
	if(Object.keys(insertMeta).length>0) await AddMetaData(app,file,insertMeta);
}
export async function AddMetaData(app,file=null,addMeta={}){
	if(!file) file = app.workspace.getActiveFile();
	if(!file||!app.metadataCache) return;
	/*/*/
	const { type,category,tags,data } = addMeta;
	const trueFields = {
		...(type !== undefined && { wv_type: type }),
		...(category !== undefined && { wv_category: category }),
		...(tags !== undefined && { wv_tags: tags }),
		...(data !== undefined && { wv_data: data })
	};

	const fieldsArr = Object.keys(trueFields);
	let content = await app.vault.read(file);
	let lines = content.split('\n');
	let yamlStartLine = lines.indexOf('---');
	let hasYaml = yamlStartLine !== -1 && lines.slice(0, yamlStartLine).every(l=>!l);
	let changed = false;
	if (hasYaml){
		// Search through the frontmatter to update target fields if they exist
		let i;
		for (i=yamlStartLine+1; i<lines.length && fieldsArr.length; i++) {
			if (lines[i].startsWith('---')) { break }

			const [key, val] = lines[i].split(': ');
			const targetIndex = fieldsArr.indexOf(key);
			if (targetIndex === -1) { continue }

			const newVal = trueFields[key];
			if (val !== newVal) {
				lines[i] = `${key}: ${newVal}`;
				changed = true;
			}
			// lines[i] = `${key}: ${trueFields[key]}`;
			fieldsArr.splice(targetIndex, 1);
		}
		// Create new fields with their value if it didn't exist before
		if (fieldsArr.length) {
			lines.splice(i, 0, ...formatYamlFields(fieldsArr, trueFields));
			i += fieldsArr.length;
			changed = true;
		}
		// Add YAML ending separator if needed
		const end = lines.indexOf('---', i);
		if (end === -1) {
			lines.splice(i, 0, '---');
			changed = true;
		}
	} else {
		lines.unshift(stripIndents`
		---
		${formatYamlFields(fieldsArr, trueFields).join('\n')}
		---
	  `);
		changed = true;
	}
	// Skip write if no change was made
	if (!changed) { return }
	const newContent = lines.join('\n');
	await app.vault.modify(file, newContent);
}
function formatYamlFields(fields, data){
	return fields.map((key) => [key, `${data[key]}`])
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([key, val]) => `${key}: ${val}`);
}
