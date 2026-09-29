@tool
class_name MCPNodeCommands
extends MCPBaseCommandProcessor

func process_command(client_id: int, command_type: String, params: Dictionary, command_id: String) -> bool:
	match command_type:
		"create_node":
			_create_node(client_id, params, command_id)
			return true
		"delete_node":
			_delete_node(client_id, params, command_id)
			return true
		"update_node_property":
			_update_node_property(client_id, params, command_id)
			return true
		"get_node_properties":
			_get_node_properties(client_id, params, command_id)
			return true
		"get_node_subtree":
			_get_node_subtree(client_id, params, command_id)
			return true
		"list_nodes":
			_list_nodes(client_id, params, command_id)
			return true
		"find_nodes":
			_find_nodes(client_id, params, command_id)
			return true
		"batch_update_node_properties":
			_batch_update_node_properties(client_id, params, command_id)
			return true
		"inspect_control_layouts":
			_inspect_control_layouts(client_id, params, command_id)
			return true
		"diagnose_layout_issues":
			_diagnose_layout_issues(client_id, params, command_id)
			return true
		"auto_fix_layout_issues":
			_auto_fix_layout_issues(client_id, params, command_id)
			return true
		"align_controls":
			_align_controls(client_id, params, command_id)
			return true
		"list_node_signals":
			_list_node_signals(client_id, params, command_id)
			return true
		"get_node_signal_info":
			_get_node_signal_info(client_id, params, command_id)
			return true
		"list_node_signal_connections":
			_list_node_signal_connections(client_id, params, command_id)
			return true
		"connect_node_signal":
			_connect_node_signal(client_id, params, command_id)
			return true
		"disconnect_node_signal":
			_disconnect_node_signal(client_id, params, command_id)
			return true
		"disconnect_all_node_signal_connections":
			_disconnect_all_node_signal_connections(client_id, params, command_id)
			return true
	return false  # Command not handled

func _create_node(client_id: int, params: Dictionary, command_id: String) -> void:
	var parent_path = params.get("parent_path", "/root")
	var node_type = params.get("node_type", "Node")
	var node_name = params.get("node_name", "NewNode")
	
	# Validation
	if not ClassDB.class_exists(node_type):
		return _send_error(client_id, "Invalid node type: %s" % node_type, command_id)
	
	# Get editor plugin and interfaces
	var plugin = Engine.get_meta("GodotMCPPlugin")
	if not plugin:
		return _send_error(client_id, "GodotMCPPlugin not found in Engine metadata", command_id)
	
	var editor_interface = plugin.get_editor_interface()
	var edited_scene_root = editor_interface.get_edited_scene_root()
	
	if not edited_scene_root:
		return _send_error(client_id, "No scene is currently being edited", command_id)
	
	# Get the parent node using the editor node helper
	var parent = _get_editor_node(parent_path)
	if not parent:
		return _send_error(client_id, "Parent node not found: %s" % parent_path, command_id)
	
	# Create the node
	var node
	if ClassDB.can_instantiate(node_type):
		node = ClassDB.instantiate(node_type)
	else:
		return _send_error(client_id, "Cannot instantiate node of type: %s" % node_type, command_id)
	
	if not node:
		return _send_error(client_id, "Failed to create node of type: %s" % node_type, command_id)
	
	# Set the node name
	node.name = node_name
	
	# Add the node to the parent
	parent.add_child(node)
	
	# Set owner for proper serialization
	node.owner = edited_scene_root
	
	# Mark the scene as modified
	_mark_scene_modified()
	
	_send_success(client_id, {
		"node_path": parent_path + "/" + node_name
	}, command_id)

func _delete_node(client_id: int, params: Dictionary, command_id: String) -> void:
	var node_path = params.get("node_path", "")
	
	# Validation
	if node_path.is_empty():
		return _send_error(client_id, "Node path cannot be empty", command_id)
	
	# Get editor plugin and interfaces
	var plugin = Engine.get_meta("GodotMCPPlugin")
	if not plugin:
		return _send_error(client_id, "GodotMCPPlugin not found in Engine metadata", command_id)
	
	var editor_interface = plugin.get_editor_interface()
	var edited_scene_root = editor_interface.get_edited_scene_root()
	
	if not edited_scene_root:
		return _send_error(client_id, "No scene is currently being edited", command_id)
	
	# Get the node using the editor node helper
	var node = _get_editor_node(node_path)
	if not node:
		return _send_error(client_id, "Node not found: %s" % node_path, command_id)
	
	# Cannot delete the root node
	if node == edited_scene_root:
		return _send_error(client_id, "Cannot delete the root node", command_id)
	
	# Get parent for operation
	var parent = node.get_parent()
	if not parent:
		return _send_error(client_id, "Node has no parent: %s" % node_path, command_id)
	
	# Remove the node
	parent.remove_child(node)
	node.queue_free()
	
	# Mark the scene as modified
	_mark_scene_modified()
	
	_send_success(client_id, {
		"deleted_node_path": node_path
	}, command_id)

func _update_node_property(client_id: int, params: Dictionary, command_id: String) -> void:
	var node_path = params.get("node_path", "")
	var property_name = params.get("property", "")
	var property_value = params.get("value")
	
	# Validation
	if node_path.is_empty():
		return _send_error(client_id, "Node path cannot be empty", command_id)
	
	if property_name.is_empty():
		return _send_error(client_id, "Property name cannot be empty", command_id)
	
	if property_value == null:
		return _send_error(client_id, "Property value cannot be null", command_id)
	
	# Get editor plugin and interfaces
	var plugin = Engine.get_meta("GodotMCPPlugin")
	if not plugin:
		return _send_error(client_id, "GodotMCPPlugin not found in Engine metadata", command_id)
	
	# Get the node using the editor node helper
	var node = _get_editor_node(node_path)
	if not node:
		return _send_error(client_id, "Node not found: %s" % node_path, command_id)
	
	# Check if the property exists
	if not property_name in node:
		return _send_error(client_id, "Property %s does not exist on node %s" % [property_name, node_path], command_id)
	
	# Parse property value for Godot types
	var parsed_value = _parse_property_value(property_value)
	
	# Get current property value for undo
	var old_value = node.get(property_name)
	
	# Get undo/redo system
	var undo_redo = _get_undo_redo()
	if not undo_redo:
		# Fallback method if we can't get undo/redo
		node.set(property_name, parsed_value)
		_mark_scene_modified()
	else:
		# Use undo/redo for proper editor integration
		undo_redo.create_action("Update Property: " + property_name)
		undo_redo.add_do_property(node, property_name, parsed_value)
		undo_redo.add_undo_property(node, property_name, old_value)
		undo_redo.commit_action()
	
	# Mark the scene as modified
	_mark_scene_modified()
	
	_send_success(client_id, {
		"node_path": node_path,
		"property": property_name,
		"value": property_value,
		"parsed_value": str(parsed_value)
	}, command_id)

func _get_node_properties(client_id: int, params: Dictionary, command_id: String) -> void:
	var node_path = params.get("node_path", "")
	
	# Validation
	if node_path.is_empty():
		return _send_error(client_id, "Node path cannot be empty", command_id)
	
	# Get the node using the editor node helper
	var node = _get_editor_node(node_path)
	if not node:
		return _send_error(client_id, "Node not found: %s" % node_path, command_id)
	
	# Get all properties
	var properties = {}
	var property_list = node.get_property_list()
	
	for prop in property_list:
		var name = prop["name"]
		if not name.begins_with("_"):  # Skip internal properties
			properties[name] = node.get(name)
	
	_send_success(client_id, {
		"node_path": node_path,
		"properties": properties
	}, command_id)

func _get_node_subtree(client_id: int, params: Dictionary, command_id: String) -> void:
	var node_path = params.get("node_path", "")

	if node_path.is_empty():
		return _send_error(client_id, "Node path cannot be empty", command_id)

	var node = _get_editor_node(node_path)
	if not node:
		return _send_error(client_id, "Node not found: %s" % node_path, command_id)

	_send_success(client_id, {
		"node_path": node_path,
		"subtree": _serialize_node_subtree(node, node_path)
	}, command_id)

func _list_nodes(client_id: int, params: Dictionary, command_id: String) -> void:
	var parent_path = params.get("parent_path", "/root")
	
	# Get the parent node using the editor node helper
	var parent = _get_editor_node(parent_path)
	if not parent:
		return _send_error(client_id, "Parent node not found: %s" % parent_path, command_id)
	
	# Get children
	var children = []
	for child in parent.get_children():
		children.append({
			"name": child.name,
			"type": child.get_class(),
			"path": str(child.get_path()).replace(str(parent.get_path()), parent_path)
		})
	
	_send_success(client_id, {
		"parent_path": parent_path,
		"children": children
	}, command_id)

func _find_nodes(client_id: int, params: Dictionary, command_id: String) -> void:
	var parent_path = params.get("parent_path", "/root")
	var name_contains = params.get("name_contains", "")
	var node_type = params.get("node_type", "")
	var recursive = params.get("recursive", true)

	var parent = _get_editor_node(parent_path)
	if not parent:
		return _send_error(client_id, "Parent node not found: %s" % parent_path, command_id)

	var matches = []
	_collect_matching_nodes(parent, parent_path, name_contains, node_type, recursive, matches, true)

	_send_success(client_id, {
		"parent_path": parent_path,
		"matches": matches,
		"count": matches.size()
	}, command_id)

func _batch_update_node_properties(client_id: int, params: Dictionary, command_id: String) -> void:
	var updates = params.get("updates", [])

	if not updates is Array or updates.is_empty():
		return _send_error(client_id, "Updates must be a non-empty array", command_id)

	for update in updates:
		if not update is Dictionary:
			return _send_error(client_id, "Each update must be a dictionary", command_id)

		var check_node_path = update.get("node_path", "")
		var check_property_name = update.get("property", "")
		var check_property_value = update.get("value")

		if check_node_path.is_empty() or check_property_name.is_empty() or check_property_value == null:
			return _send_error(client_id, "Each update must include node_path, property, and value", command_id)

		var check_node = _get_editor_node(check_node_path)
		if not check_node:
			return _send_error(client_id, "Node not found: %s" % check_node_path, command_id)

		if not check_property_name in check_node:
			return _send_error(client_id, "Property %s does not exist on node %s" % [check_property_name, check_node_path], command_id)

	var undo_redo = _get_undo_redo()
	if undo_redo:
		undo_redo.create_action("Batch Update Node Properties")

	var results = []

	for update in updates:
		var node_path = update.get("node_path", "")
		var property_name = update.get("property", "")
		var property_value = update.get("value")

		var node = _get_editor_node(node_path)
		var parsed_value = _parse_property_value(property_value)
		var old_value = node.get(property_name)

		if undo_redo:
			undo_redo.add_do_property(node, property_name, parsed_value)
			undo_redo.add_undo_property(node, property_name, old_value)
		else:
			node.set(property_name, parsed_value)

		results.append({
			"node_path": node_path,
			"property": property_name,
			"parsed_value": str(parsed_value)
		})

	if undo_redo:
		undo_redo.commit_action()

	_mark_scene_modified()

	_send_success(client_id, {
		"updated": results,
		"count": results.size()
	}, command_id)

func _collect_matching_nodes(node: Node, display_path: String, name_contains: String, node_type: String, recursive: bool, matches: Array, skip_self: bool = false) -> void:
	if not skip_self and _node_matches(node, name_contains, node_type):
		matches.append({
			"name": node.name,
			"type": node.get_class(),
			"path": display_path
		})

	for child in node.get_children():
		var child_path = display_path.trim_suffix("/") + "/" + child.name
		if _node_matches(child, name_contains, node_type):
			matches.append({
				"name": child.name,
				"type": child.get_class(),
				"path": child_path
			})
		if recursive:
			_collect_matching_nodes(child, child_path, name_contains, node_type, recursive, matches, true)

func _node_matches(node: Node, name_contains: String, node_type: String) -> bool:
	var matches_name = name_contains.is_empty() or node.name.to_lower().contains(name_contains.to_lower())
	var matches_type = node_type.is_empty() or node.is_class(node_type) or node.get_class() == node_type
	return matches_name and matches_type

func _inspect_control_layouts(client_id: int, params: Dictionary, command_id: String) -> void:
	var parent_path = params.get("parent_path", "/root")
	var recursive = params.get("recursive", true)
	var include_hidden = params.get("include_hidden", false)

	var parent = _get_editor_node(parent_path)
	if not parent:
		return _send_error(client_id, "Parent node not found: %s" % parent_path, command_id)

	var controls = []
	_collect_control_layouts(parent, parent_path, recursive, include_hidden, controls, true)

	_send_success(client_id, {
		"parent_path": parent_path,
		"controls": controls,
		"count": controls.size()
	}, command_id)

func _diagnose_layout_issues(client_id: int, params: Dictionary, command_id: String) -> void:
	var parent_path = params.get("parent_path", "/root")
	var recursive = params.get("recursive", true)
	var include_hidden = params.get("include_hidden", false)

	var parent = _get_editor_node(parent_path)
	if not parent:
		return _send_error(client_id, "Parent node not found: %s" % parent_path, command_id)

	var controls = []
	_collect_control_nodes(parent, parent_path, recursive, include_hidden, controls, true)

	var issues = []
	var viewport_rect = _get_editor_viewport_rect()

	for entry in controls:
		var control = entry["node"] as Control
		var control_path = entry["path"] as String
		var control_name = entry["name"] as String

		_collect_control_issues(control, control_path, control_name, viewport_rect, issues)

	var overlap_issues = _detect_sibling_overlaps(controls)
	issues.append_array(overlap_issues)

	_send_success(client_id, {
		"parent_path": parent_path,
		"issue_count": issues.size(),
		"issues": issues
	}, command_id)

func _auto_fix_layout_issues(client_id: int, params: Dictionary, command_id: String) -> void:
	var parent_path = params.get("parent_path", "/root")
	var recursive = params.get("recursive", true)
	var include_hidden = params.get("include_hidden", false)
	var clamp_to_parent = params.get("clamp_to_parent", true)

	var parent = _get_editor_node(parent_path)
	if not parent:
		return _send_error(client_id, "Parent node not found: %s" % parent_path, command_id)

	var controls = []
	_collect_control_nodes(parent, parent_path, recursive, include_hidden, controls, true)

	var undo_redo = _get_undo_redo()
	if undo_redo:
		undo_redo.create_action("Auto Fix Layout Issues")

	var fixes = []

	for entry in controls:
		var control = entry["node"] as Control
		var control_path = entry["path"] as String
		var before_size = control.size

		fixes.append_array(_apply_control_fixes(control, control_path, clamp_to_parent, undo_redo))

		if not undo_redo and control.size != before_size:
			control.queue_redraw()

	if undo_redo and fixes.size() > 0:
		undo_redo.commit_action()

	if fixes.size() > 0:
		_mark_scene_modified()

	_send_success(client_id, {
		"parent_path": parent_path,
		"fix_count": fixes.size(),
		"fixes": fixes
	}, command_id)

func _align_controls(client_id: int, params: Dictionary, command_id: String) -> void:
	var node_paths = params.get("node_paths", [])
	var axis = params.get("axis", "left")
	var spacing = float(params.get("spacing", 0.0))

	if not node_paths is Array or node_paths.size() < 2:
		return _send_error(client_id, "node_paths must contain at least two controls", command_id)

	var controls = []
	for node_path in node_paths:
		var control = _get_editor_node(node_path)
		if not control or not control is Control:
			return _send_error(client_id, "Control not found: %s" % node_path, command_id)
		controls.append(control)

	var undo_redo = _get_undo_redo()
	if undo_redo:
		undo_redo.create_action("Align Controls")

	var fixes = []
	var reference = controls[0] as Control
	var current_offset = 0.0

	if axis in ["horizontal_flow", "vertical_flow"]:
		current_offset = reference.position.x if axis == "horizontal_flow" else reference.position.y

	for index in range(controls.size()):
		var control = controls[index] as Control
		var old_position = control.position
		var new_position = old_position

		match axis:
			"left":
				new_position.x = reference.position.x
			"right":
				new_position.x = reference.position.x + reference.size.x - control.size.x
			"top":
				new_position.y = reference.position.y
			"bottom":
				new_position.y = reference.position.y + reference.size.y - control.size.y
			"hcenter":
				new_position.x = reference.position.x + (reference.size.x - control.size.x) * 0.5
			"vcenter":
				new_position.y = reference.position.y + (reference.size.y - control.size.y) * 0.5
			"horizontal_flow":
				if index == 0:
					current_offset = reference.position.x
				new_position.x = current_offset
				current_offset += control.size.x + spacing
			"vertical_flow":
				if index == 0:
					current_offset = reference.position.y
				new_position.y = current_offset
				current_offset += control.size.y + spacing
			_:
				return _send_error(client_id, "Unsupported axis: %s" % axis, command_id)

		if undo_redo:
			undo_redo.add_do_property(control, "position", new_position)
			undo_redo.add_undo_property(control, "position", old_position)
		else:
			control.position = new_position

		if new_position != old_position:
			fixes.append({
				"node_path": node_paths[index],
				"axis": axis,
				"from": str(old_position),
				"to": str(new_position)
			})

	if undo_redo and fixes.size() > 0:
		undo_redo.commit_action()

	if fixes.size() > 0:
		_mark_scene_modified()

	_send_success(client_id, {
		"axis": axis,
		"updated_count": fixes.size(),
		"updates": fixes
	}, command_id)

func _collect_control_layouts(node: Node, display_path: String, recursive: bool, include_hidden: bool, results: Array, skip_self: bool = false) -> void:
	if not skip_self and node is Control:
		var control = node as Control
		if include_hidden or control.visible:
			results.append(_build_control_layout_snapshot(control, display_path))

	for child in node.get_children():
		var child_path = display_path.trim_suffix("/") + "/" + child.name
		if child is Control:
			var child_control = child as Control
			if include_hidden or child_control.visible:
				results.append(_build_control_layout_snapshot(child_control, child_path))
		if recursive:
			_collect_control_layouts(child, child_path, recursive, include_hidden, results, true)

func _collect_control_nodes(node: Node, display_path: String, recursive: bool, include_hidden: bool, results: Array, skip_self: bool = false) -> void:
	if not skip_self and node is Control:
		var control = node as Control
		if include_hidden or control.visible:
			results.append({
				"node": control,
				"path": display_path,
				"name": control.name
			})

	for child in node.get_children():
		var child_path = display_path.trim_suffix("/") + "/" + child.name
		if child is Control:
			var child_control = child as Control
			if include_hidden or child_control.visible:
				results.append({
					"node": child_control,
					"path": child_path,
					"name": child_control.name
				})
		if recursive:
			_collect_control_nodes(child, child_path, recursive, include_hidden, results, true)

func _build_control_layout_snapshot(control: Control, control_path: String) -> Dictionary:
	var rect = Rect2(control.global_position, control.size)
	var parent_rect = _get_parent_control_rect(control)
	return {
		"path": control_path,
		"name": control.name,
		"type": control.get_class(),
		"visible": control.visible,
		"anchors": {
			"left": control.anchor_left,
			"top": control.anchor_top,
			"right": control.anchor_right,
			"bottom": control.anchor_bottom
		},
		"offsets": {
			"left": control.offset_left,
			"top": control.offset_top,
			"right": control.offset_right,
			"bottom": control.offset_bottom
		},
		"position": {"x": control.position.x, "y": control.position.y},
		"size": {"x": control.size.x, "y": control.size.y},
		"global_rect": {
			"position": {"x": rect.position.x, "y": rect.position.y},
			"size": {"x": rect.size.x, "y": rect.size.y}
		},
		"parent_rect": {
			"position": {"x": parent_rect.position.x, "y": parent_rect.position.y},
			"size": {"x": parent_rect.size.x, "y": parent_rect.size.y}
		}
	}

func _collect_control_issues(control: Control, control_path: String, control_name: String, viewport_rect: Rect2, issues: Array) -> void:
	var rect = Rect2(control.global_position, control.size)
	var parent_rect = _get_parent_control_rect(control)

	if control.anchor_left > control.anchor_right or control.anchor_top > control.anchor_bottom:
		issues.append({
			"path": control_path,
			"name": control_name,
			"type": "anchor_order",
			"severity": "warning",
			"message": "Anchor order is reversed"
		})

	if control.offset_left > control.offset_right or control.offset_top > control.offset_bottom:
		issues.append({
			"path": control_path,
			"name": control_name,
			"type": "offset_order",
			"severity": "warning",
			"message": "Offset order is reversed"
		})

	if control.size.x <= 0 or control.size.y <= 0:
		issues.append({
			"path": control_path,
			"name": control_name,
			"type": "negative_or_zero_size",
			"severity": "error",
			"message": "Control size is zero or negative"
		})

	if control is BaseButton and (control.size.x < 44 or control.size.y < 24):
		issues.append({
			"path": control_path,
			"name": control_name,
			"type": "small_interactive_area",
			"severity": "warning",
			"message": "Interactive control is smaller than recommended minimum size"
		})

	if not viewport_rect.encloses(rect):
		issues.append({
			"path": control_path,
			"name": control_name,
			"type": "offscreen",
			"severity": "warning",
			"message": "Control extends beyond the editor viewport"
		})

	if parent_rect.size != Vector2.ZERO and not parent_rect.encloses(rect):
		issues.append({
			"path": control_path,
			"name": control_name,
			"type": "overflow_parent",
			"severity": "warning",
			"message": "Control extends beyond its parent control bounds"
		})

func _detect_sibling_overlaps(control_entries: Array) -> Array:
	var issues = []
	var grouped = {}

	for entry in control_entries:
		var control = entry["node"] as Control
		var parent_key = str(control.get_parent())
		if not grouped.has(parent_key):
			grouped[parent_key] = []
		grouped[parent_key].append(entry)

	for entries in grouped.values():
		for i in range(entries.size()):
			for j in range(i + 1, entries.size()):
				var first = entries[i]
				var second = entries[j]
				var first_control = first["node"] as Control
				var second_control = second["node"] as Control
				if Rect2(first_control.global_position, first_control.size).intersects(Rect2(second_control.global_position, second_control.size)):
					issues.append({
						"path": first["path"],
						"name": first["name"],
						"type": "overlap",
						"severity": "warning",
						"message": "Overlaps with sibling %s" % second["path"]
					})

	return issues

func _apply_control_fixes(control: Control, control_path: String, clamp_to_parent: bool, undo_redo) -> Array:
	var fixes = []

	if control.anchor_left > control.anchor_right:
		var old_left = control.anchor_left
		var old_right = control.anchor_right
		_apply_property_change(control, "anchor_left", old_right, old_left, undo_redo)
		_apply_property_change(control, "anchor_right", old_left, old_right, undo_redo)
		fixes.append({"path": control_path, "fix": "swap_horizontal_anchors"})

	if control.anchor_top > control.anchor_bottom:
		var old_top = control.anchor_top
		var old_bottom = control.anchor_bottom
		_apply_property_change(control, "anchor_top", old_bottom, old_top, undo_redo)
		_apply_property_change(control, "anchor_bottom", old_top, old_bottom, undo_redo)
		fixes.append({"path": control_path, "fix": "swap_vertical_anchors"})

	if control.offset_left > control.offset_right:
		var old_offset_left = control.offset_left
		var old_offset_right = control.offset_right
		_apply_property_change(control, "offset_left", old_offset_right, old_offset_left, undo_redo)
		_apply_property_change(control, "offset_right", old_offset_left, old_offset_right, undo_redo)
		fixes.append({"path": control_path, "fix": "swap_horizontal_offsets"})

	if control.offset_top > control.offset_bottom:
		var old_offset_top = control.offset_top
		var old_offset_bottom = control.offset_bottom
		_apply_property_change(control, "offset_top", old_offset_bottom, old_offset_top, undo_redo)
		_apply_property_change(control, "offset_bottom", old_offset_top, old_offset_bottom, undo_redo)
		fixes.append({"path": control_path, "fix": "swap_vertical_offsets"})

	if control is BaseButton:
		var minimum = control.custom_minimum_size
		var target_minimum = Vector2(max(minimum.x, 44.0), max(minimum.y, 24.0))
		if target_minimum != minimum:
			_apply_property_change(control, "custom_minimum_size", target_minimum, minimum, undo_redo)
			fixes.append({"path": control_path, "fix": "raise_button_minimum_size"})

	if clamp_to_parent:
		var parent_rect = _get_parent_control_rect(control)
		if parent_rect.size != Vector2.ZERO:
			var position = control.position
			var clamped_position = Vector2(
				clamp(position.x, 0.0, max(parent_rect.size.x - control.size.x, 0.0)),
				clamp(position.y, 0.0, max(parent_rect.size.y - control.size.y, 0.0))
			)
			if clamped_position != position:
				_apply_property_change(control, "position", clamped_position, position, undo_redo)
				fixes.append({"path": control_path, "fix": "clamp_position_to_parent"})

	return fixes

func _apply_property_change(node: Object, property_name: String, new_value, old_value, undo_redo) -> void:
	if undo_redo:
		undo_redo.add_do_property(node, property_name, new_value)
		undo_redo.add_undo_property(node, property_name, old_value)
	else:
		node.set(property_name, new_value)

func _get_parent_control_rect(control: Control) -> Rect2:
	var parent = control.get_parent()
	if parent is Control:
		return Rect2((parent as Control).global_position, (parent as Control).size)
	return Rect2(Vector2.ZERO, _get_editor_viewport_rect().size)

func _get_editor_viewport_rect() -> Rect2:
	var plugin = Engine.get_meta("GodotMCPPlugin")
	if plugin and plugin.has_method("get_editor_interface"):
		var viewport = plugin.get_editor_interface().get_editor_viewport_2d()
		if viewport:
			return viewport.get_visible_rect()
	return Rect2(Vector2.ZERO, Vector2(1920, 1080))

func _serialize_node_subtree(node: Node, node_path: String) -> Dictionary:
	var data = {
		"name": node.name,
		"type": node.get_class(),
		"path": node_path,
		"children": []
	}

	if node is Control:
		data["layout"] = _build_control_layout_snapshot(node as Control, node_path)

	var script = node.get_script()
	if script:
		data["script"] = script.resource_path

	for child in node.get_children():
		var child_path = node_path.trim_suffix("/") + "/" + child.name
		data["children"].append(_serialize_node_subtree(child, child_path))

	return data

func _list_node_signals(client_id: int, params: Dictionary, command_id: String) -> void:
	var node_path = params.get("node_path", "")
	if node_path.is_empty():
		return _send_error(client_id, "Node path cannot be empty", command_id)

	var node = _get_editor_node(node_path)
	if not node:
		return _send_error(client_id, "Node not found: %s" % node_path, command_id)

	var signals := []
	for signal_info in node.get_signal_list():
		signals.append({
			"name": signal_info.get("name", ""),
			"args": signal_info.get("args", [])
		})

	_send_success(client_id, {
		"node_path": node_path,
		"signals": signals
	}, command_id)

func _get_node_signal_info(client_id: int, params: Dictionary, command_id: String) -> void:
	var node_path = params.get("node_path", "")
	var signal_name = params.get("signal_name", "")

	if node_path.is_empty():
		return _send_error(client_id, "Node path cannot be empty", command_id)
	if signal_name.is_empty():
		return _send_error(client_id, "Signal name cannot be empty", command_id)

	var node = _get_editor_node(node_path)
	if not node:
		return _send_error(client_id, "Node not found: %s" % node_path, command_id)
	if not node.has_signal(signal_name):
		return _send_error(client_id, "Signal %s does not exist on node %s" % [signal_name, node_path], command_id)

	var signal_details := {}
	for signal_info in node.get_signal_list():
		if signal_info.get("name", "") == signal_name:
			signal_details = {
				"name": signal_name,
				"args": signal_info.get("args", [])
			}
			break

	var connections = _build_signal_connections(node, signal_name)
	signal_details["connection_count"] = connections.size()
	signal_details["connections"] = connections

	_send_success(client_id, {
		"node_path": node_path,
		"signal": signal_details
	}, command_id)

func _list_node_signal_connections(client_id: int, params: Dictionary, command_id: String) -> void:
	var node_path = params.get("node_path", "")
	var signal_name = params.get("signal_name", "")

	if node_path.is_empty():
		return _send_error(client_id, "Node path cannot be empty", command_id)
	if signal_name.is_empty():
		return _send_error(client_id, "Signal name cannot be empty", command_id)

	var node = _get_editor_node(node_path)
	if not node:
		return _send_error(client_id, "Node not found: %s" % node_path, command_id)
	if not node.has_signal(signal_name):
		return _send_error(client_id, "Signal %s does not exist on node %s" % [signal_name, node_path], command_id)

	var connections = _build_signal_connections(node, signal_name)
	_send_success(client_id, {
		"node_path": node_path,
		"signal_name": signal_name,
		"connections": connections,
		"connection_count": connections.size()
	}, command_id)

func _connect_node_signal(client_id: int, params: Dictionary, command_id: String) -> void:
	var source_path = params.get("source_node_path", "")
	var signal_name = params.get("signal_name", "")
	var target_path = params.get("target_node_path", "")
	var method_name = params.get("method_name", "")
	var flags = int(params.get("flags", CONNECT_PERSIST))

	if source_path.is_empty() or signal_name.is_empty() or target_path.is_empty() or method_name.is_empty():
		return _send_error(client_id, "source_node_path, signal_name, target_node_path, and method_name are required", command_id)

	var source = _get_editor_node(source_path)
	var target = _get_editor_node(target_path)
	if not source:
		return _send_error(client_id, "Source node not found: %s" % source_path, command_id)
	if not target:
		return _send_error(client_id, "Target node not found: %s" % target_path, command_id)
	if not source.has_signal(signal_name):
		return _send_error(client_id, "Signal %s does not exist on node %s" % [signal_name, source_path], command_id)
	if not target.has_method(method_name):
		return _send_error(client_id, "Method %s does not exist on node %s" % [method_name, target_path], command_id)

	var callable = Callable(target, method_name)
	if source.is_connected(signal_name, callable):
		return _send_success(client_id, {
			"source_node_path": source_path,
			"signal_name": signal_name,
			"target_node_path": target_path,
			"method_name": method_name,
			"already_connected": true
		}, command_id)

	var result = source.connect(signal_name, callable, flags)
	if result != OK:
		return _send_error(client_id, "Failed to connect signal: %d" % result, command_id)

	_mark_scene_modified()
	_send_success(client_id, {
		"source_node_path": source_path,
		"signal_name": signal_name,
		"target_node_path": target_path,
		"method_name": method_name,
		"flags": flags
	}, command_id)

func _disconnect_node_signal(client_id: int, params: Dictionary, command_id: String) -> void:
	var source_path = params.get("source_node_path", "")
	var signal_name = params.get("signal_name", "")
	var target_path = params.get("target_node_path", "")
	var method_name = params.get("method_name", "")

	if source_path.is_empty() or signal_name.is_empty() or target_path.is_empty() or method_name.is_empty():
		return _send_error(client_id, "source_node_path, signal_name, target_node_path, and method_name are required", command_id)

	var source = _get_editor_node(source_path)
	var target = _get_editor_node(target_path)
	if not source:
		return _send_error(client_id, "Source node not found: %s" % source_path, command_id)
	if not target:
		return _send_error(client_id, "Target node not found: %s" % target_path, command_id)

	var callable = Callable(target, method_name)
	if not source.is_connected(signal_name, callable):
		return _send_success(client_id, {
			"source_node_path": source_path,
			"signal_name": signal_name,
			"target_node_path": target_path,
			"method_name": method_name,
			"was_connected": false
		}, command_id)

	source.disconnect(signal_name, callable)
	_mark_scene_modified()

	_send_success(client_id, {
		"source_node_path": source_path,
		"signal_name": signal_name,
		"target_node_path": target_path,
		"method_name": method_name,
		"was_connected": true
	}, command_id)

func _disconnect_all_node_signal_connections(client_id: int, params: Dictionary, command_id: String) -> void:
	var node_path = params.get("node_path", "")
	var signal_name = params.get("signal_name", "")

	if node_path.is_empty():
		return _send_error(client_id, "Node path cannot be empty", command_id)
	if signal_name.is_empty():
		return _send_error(client_id, "Signal name cannot be empty", command_id)

	var node = _get_editor_node(node_path)
	if not node:
		return _send_error(client_id, "Node not found: %s" % node_path, command_id)
	if not node.has_signal(signal_name):
		return _send_error(client_id, "Signal %s does not exist on node %s" % [signal_name, node_path], command_id)

	var connections = node.get_signal_connection_list(signal_name)
	var disconnected := []

	for connection in connections:
		var callable = connection.get("callable", Callable())
		if callable.is_valid() and node.is_connected(signal_name, callable):
			node.disconnect(signal_name, callable)
			disconnected.append({
				"target_node_path": _format_signal_target_path(callable.get_object()),
				"method_name": callable.get_method(),
				"flags": connection.get("flags", 0)
			})

	if not disconnected.is_empty():
		_mark_scene_modified()

	_send_success(client_id, {
		"node_path": node_path,
		"signal_name": signal_name,
		"disconnected": disconnected,
		"disconnected_count": disconnected.size()
	}, command_id)

func _build_signal_connections(node: Node, signal_name: String) -> Array:
	var connections := []
	for connection in node.get_signal_connection_list(signal_name):
		var callable = connection.get("callable", Callable())
		var target_object = callable.get_object()
		connections.append({
			"target_node_path": _format_signal_target_path(target_object),
			"target_object": str(target_object) if target_object != null else "",
			"method_name": callable.get_method(),
			"flags": connection.get("flags", 0),
			"valid": callable.is_valid()
		})
	return connections

func _format_signal_target_path(target_object: Object) -> String:
	if target_object is Node:
		return str((target_object as Node).get_path())
	return ""
