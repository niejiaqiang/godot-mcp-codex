@tool
class_name MCPFilesystemCommands
extends MCPBaseCommandProcessor

const MAX_READ_BYTES := 262144
const MAX_MATCHES := 200

func process_command(client_id: int, command_type: String, params: Dictionary, command_id: String) -> bool:
	match command_type:
		"list_directory":
			_list_directory(client_id, params, command_id)
			return true
		"read_text_file":
			_read_text_file(client_id, params, command_id)
			return true
		"search_project_files":
			_search_project_files(client_id, params, command_id)
			return true
	return false

func _list_directory(client_id: int, params: Dictionary, command_id: String) -> void:
	var path = _normalize_res_path(params.get("path", "res://"))
	if path.is_empty():
		return _send_error(client_id, "Path must stay within res://", command_id)

	var dir = DirAccess.open(path)
	if not dir:
		return _send_error(client_id, "Cannot open directory: %s" % path, command_id)

	var directories := []
	var files := []
	dir.list_dir_begin()
	var entry = dir.get_next()
	while entry != "":
		if not entry.begins_with("."):
			var entry_path = path.path_join(entry)
			if dir.current_is_dir():
				directories.append({
					"name": entry,
					"path": entry_path
				})
			else:
				files.append({
					"name": entry,
					"path": entry_path
				})
		entry = dir.get_next()
	dir.list_dir_end()

	directories.sort_custom(func(a, b): return a["name"] < b["name"])
	files.sort_custom(func(a, b): return a["name"] < b["name"])

	_send_success(client_id, {
		"path": path,
		"directories": directories,
		"files": files,
		"directory_count": directories.size(),
		"file_count": files.size()
	}, command_id)

func _read_text_file(client_id: int, params: Dictionary, command_id: String) -> void:
	var path = _normalize_res_path(params.get("path", ""))
	if path.is_empty():
		return _send_error(client_id, "Path must stay within res://", command_id)
	if not FileAccess.file_exists(path):
		return _send_error(client_id, "File not found: %s" % path, command_id)

	var file = FileAccess.open(path, FileAccess.READ)
	if not file:
		return _send_error(client_id, "Cannot read file: %s" % path, command_id)

	var total_length = file.get_length()
	var truncated = total_length > MAX_READ_BYTES
	var content = file.get_as_text(min(total_length, MAX_READ_BYTES))
	file.close()

	_send_success(client_id, {
		"path": path,
		"content": content,
		"bytes_read": content.to_utf8_buffer().size(),
		"truncated": truncated
	}, command_id)

func _search_project_files(client_id: int, params: Dictionary, command_id: String) -> void:
	var query = str(params.get("query", "")).strip_edges()
	if query.is_empty():
		return _send_error(client_id, "Query cannot be empty", command_id)

	var root_path = _normalize_res_path(params.get("root_path", "res://"))
	if root_path.is_empty():
		return _send_error(client_id, "root_path must stay within res://", command_id)

	var file_glob = str(params.get("file_glob", "*")).strip_edges()
	if file_glob.is_empty():
		file_glob = "*"

	var recursive = bool(params.get("recursive", true))
	var case_sensitive = bool(params.get("case_sensitive", false))

	var files := []
	_collect_files(root_path, file_glob, recursive, files)

	var matches := []
	var needle = query if case_sensitive else query.to_lower()
	for file_path in files:
		var file = FileAccess.open(file_path, FileAccess.READ)
		if not file:
			continue

		var line_number = 0
		while not file.eof_reached():
			var line = file.get_line()
			line_number += 1
			var haystack = line if case_sensitive else line.to_lower()
			if haystack.contains(needle):
				matches.append({
					"path": file_path,
					"line": line_number,
					"text": line.strip_edges()
				})
				if matches.size() >= MAX_MATCHES:
					file.close()
					_send_success(client_id, {
						"query": query,
						"root_path": root_path,
						"file_glob": file_glob,
						"recursive": recursive,
						"case_sensitive": case_sensitive,
						"matches": matches,
						"truncated": true
					}, command_id)
					return
		file.close()

	_send_success(client_id, {
		"query": query,
		"root_path": root_path,
		"file_glob": file_glob,
		"recursive": recursive,
		"case_sensitive": case_sensitive,
		"matches": matches,
		"truncated": false
	}, command_id)

func _collect_files(path: String, file_glob: String, recursive: bool, results: Array) -> void:
	var dir = DirAccess.open(path)
	if not dir:
		return

	dir.list_dir_begin()
	var entry = dir.get_next()
	while entry != "":
		if not entry.begins_with("."):
			var entry_path = path.path_join(entry)
			if dir.current_is_dir():
				if recursive:
					_collect_files(entry_path, file_glob, recursive, results)
			elif entry.match(file_glob):
				results.append(entry_path)
		entry = dir.get_next()
	dir.list_dir_end()

func _normalize_res_path(value: String) -> String:
	var path = value.strip_edges()
	if path.is_empty():
		return ""
	if not path.begins_with("res://"):
		path = "res://" + path.trim_prefix("/")
	return path if path.begins_with("res://") else ""
