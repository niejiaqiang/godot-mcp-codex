@tool
class_name MCPResourceCommands
extends MCPBaseCommandProcessor

func process_command(client_id: int, command_type: String, params: Dictionary, command_id: String) -> bool:
	match command_type:
		"list_resources":
			_list_resources(client_id, params, command_id)
			return true
		"get_resource_info":
			_get_resource_info(client_id, params, command_id)
			return true
		"get_resource_dependencies":
			_get_resource_dependencies(client_id, params, command_id)
			return true
	return false

func _list_resources(client_id: int, params: Dictionary, command_id: String) -> void:
	var root_path = _normalize_res_path(params.get("root_path", "res://"))
	if root_path.is_empty():
		return _send_error(client_id, "root_path must stay within res://", command_id)

	var type_filter = str(params.get("type_filter", "")).strip_edges()
	var recursive = bool(params.get("recursive", true))
	var resources := []
	_collect_resources(root_path, type_filter, recursive, resources)

	_send_success(client_id, {
		"root_path": root_path,
		"type_filter": type_filter,
		"recursive": recursive,
		"resources": resources,
		"count": resources.size()
	}, command_id)

func _get_resource_info(client_id: int, params: Dictionary, command_id: String) -> void:
	var resource_path = _normalize_res_path(params.get("resource_path", ""))
	if resource_path.is_empty():
		return _send_error(client_id, "resource_path must stay within res://", command_id)
	if not ResourceLoader.exists(resource_path):
		return _send_error(client_id, "Resource not found: %s" % resource_path, command_id)

	var resource = ResourceLoader.load(resource_path, "", ResourceLoader.CACHE_MODE_REPLACE)
	if not resource:
		return _send_error(client_id, "Failed to load resource: %s" % resource_path, command_id)

	var info = {
		"resource_path": resource_path,
		"type": resource.get_class(),
		"name": resource_path.get_file(),
		"extension": resource_path.get_extension(),
		"resource_name": resource.resource_name,
		"properties": _serialize_resource_properties(resource)
	}

	if resource is Texture2D:
		info["width"] = resource.get_width()
		info["height"] = resource.get_height()
	elif resource is PackedScene:
		var scene_state = resource.get_state()
		info["node_count"] = scene_state.get_node_count()
	elif resource is Script:
		info["base_type"] = resource.get_instance_base_type() if resource.has_method("get_instance_base_type") else ""
	elif resource is AudioStream:
		info["length"] = resource.get_length() if resource.has_method("get_length") else 0.0

	_send_success(client_id, info, command_id)

func _get_resource_dependencies(client_id: int, params: Dictionary, command_id: String) -> void:
	var resource_path = _normalize_res_path(params.get("resource_path", ""))
	if resource_path.is_empty():
		return _send_error(client_id, "resource_path must stay within res://", command_id)
	if not ResourceLoader.exists(resource_path):
		return _send_error(client_id, "Resource not found: %s" % resource_path, command_id)

	var dependencies := []
	for dependency in ResourceLoader.get_dependencies(resource_path):
		dependencies.append(str(dependency))

	_send_success(client_id, {
		"resource_path": resource_path,
		"dependencies": dependencies,
		"count": dependencies.size()
	}, command_id)

func _collect_resources(path: String, type_filter: String, recursive: bool, results: Array) -> void:
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
					_collect_resources(entry_path, type_filter, recursive, results)
			else:
				var resource_type = ResourceLoader.get_resource_type(entry_path)
				if resource_type.is_empty():
					entry = dir.get_next()
					continue
				if type_filter.is_empty() or resource_type == type_filter:
					results.append({
						"path": entry_path,
						"name": entry,
						"type": resource_type
					})
		entry = dir.get_next()
	dir.list_dir_end()

func _serialize_resource_properties(resource: Resource) -> Dictionary:
	var properties := {}
	for prop in resource.get_property_list():
		var name = str(prop.get("name", ""))
		if name.is_empty() or name.begins_with("_"):
			continue
		if name in ["resource_path", "resource_name", "resource_local_to_scene", "resource_scene_unique_id", "script"]:
			continue
		var usage = int(prop.get("usage", PROPERTY_USAGE_DEFAULT))
		if usage & PROPERTY_USAGE_STORAGE == 0:
			continue
		properties[name] = _serialize_value(resource.get(name))
	return properties

func _serialize_value(value):
	match typeof(value):
		TYPE_VECTOR2, TYPE_VECTOR2I:
			return {"x": value.x, "y": value.y}
		TYPE_VECTOR3, TYPE_VECTOR3I:
			return {"x": value.x, "y": value.y, "z": value.z}
		TYPE_VECTOR4, TYPE_VECTOR4I:
			return {"x": value.x, "y": value.y, "z": value.z, "w": value.w}
		TYPE_COLOR:
			return {"r": value.r, "g": value.g, "b": value.b, "a": value.a}
		TYPE_RECT2, TYPE_RECT2I:
			return {
				"position": _serialize_value(value.position),
				"size": _serialize_value(value.size)
			}
		TYPE_OBJECT:
			if value is Resource:
				return value.resource_path if not value.resource_path.is_empty() else value.get_class()
			if value is Node:
				return str(value.get_path())
			return str(value)
		TYPE_ARRAY:
			var items := []
			for item in value:
				items.append(_serialize_value(item))
			return items
		TYPE_DICTIONARY:
			var data := {}
			for key in value.keys():
				data[str(key)] = _serialize_value(value[key])
			return data
	return value

func _normalize_res_path(value: String) -> String:
	var path = value.strip_edges()
	if path.is_empty():
		return ""
	if not path.begins_with("res://"):
		path = "res://" + path.trim_prefix("/")
	return path if path.begins_with("res://") else ""
