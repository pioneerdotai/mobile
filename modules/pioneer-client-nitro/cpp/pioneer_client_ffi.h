#pragma once

#ifdef __cplusplus
extern "C" {
#endif

typedef struct PioneerClientFfi PioneerClientFfi;

char* pioneer_client_ffi_version(void);
PioneerClientFfi* pioneer_client_ffi_client_create(void);
void pioneer_client_ffi_client_destroy(PioneerClientFfi* client);
char* pioneer_client_ffi_client_initialize(PioneerClientFfi* client, const char* config_json);
char* pioneer_client_ffi_diagnostics_drain(PioneerClientFfi* client);
char* pioneer_client_ffi_gateway_validate_remote(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_plan_add_remote(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_plan_add_and_activate_remote_registry(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_plan_activate_registry(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_plan_update_remote_registry(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_plan_delete_remote_registry(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_plan_set_workspace_registry(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_connect(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_next_events(PioneerClientFfi* client);
char* pioneer_client_ffi_gateway_disconnect(PioneerClientFfi* client);
char* pioneer_client_ffi_workspace_bootstrap(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_workspace_switch(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_workspace_create(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_workspace_rename(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_provider_list(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_cli_runtime_list(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_cli_runtime_list_models(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_cli_runtime_thread_binding_get(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_cli_runtime_thread_compact(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_cli_runtime_turn_steer(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_cli_runtime_review_start(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_cli_runtime_request_respond(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_provider_list_models(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_provider_model_display(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_reasoning_effort_rows(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_attachment_from_path(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_attachments_update(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_skill_picker_rows(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_mcp_picker_rows(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_capabilities_update(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_skill_capability_from_row(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_mcp_capability_from_row(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_skill_toggle(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_mcp_toggle(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_filter_skill_rows(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_filter_mcp_rows(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_thread_tree_refresh(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_thread_tree_level(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_agents_doc_get(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_agents_doc_save(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_agents_doc_archive(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_active_thread_open(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_active_thread_snapshot(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_active_thread_apply_event(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_active_thread_send_text(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_active_thread_cancel_turn(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_active_thread_clear(PioneerClientFfi* client);
void pioneer_client_ffi_string_destroy(char* value);

#ifdef __cplusplus
}
#endif
