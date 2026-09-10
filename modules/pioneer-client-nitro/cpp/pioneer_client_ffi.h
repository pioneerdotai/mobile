#pragma once

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct PioneerClientFfi PioneerClientFfi;

char* pioneer_client_ffi_version(void);
PioneerClientFfi* pioneer_client_ffi_client_create(void);
void pioneer_client_ffi_client_destroy(PioneerClientFfi* client);
char* pioneer_client_ffi_client_initialize(PioneerClientFfi* client, const char* config_json);
char* pioneer_client_ffi_client_intent_dispatch(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_client_scope_acquire(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_client_scope_release(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_client_scoped_snapshot(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_client_change_batch(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_client_wait_publications(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_client_shutdown(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_session_validate(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_client_effect_complete(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_client_effect_cancel(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_client_sequence_gap_resnapshot(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_mobile_startup_record(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_diagnostics_drain(PioneerClientFfi* client);
char* pioneer_client_ffi_gateway_load_registry_v3(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_device_activation_presentation(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_device_activation_parse(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_auth_me(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_authorization_capabilities(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_invitation_presentation(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_invitation_create(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_member_avatar_cache(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_agent_avatar_cache(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_member_device_create(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_transport_reserve(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_transport_wait(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_gateway_transport_release(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_artifact_view_open(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_thread_file_view_open(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_artifact_download(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_workspace_bootstrap(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_workspace_switch(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_workspace_create(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_workspace_rename(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_voice_capture_plan(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_voice_session_start(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_voice_audio_chunk(PioneerClientFfi* client, const char* input_json, const uint8_t* pcm_ptr, size_t pcm_len);
char* pioneer_client_ffi_voice_session_finalize(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_voice_session_cancel(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_pending_request_presentation(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_principal_presentation_capabilities(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_artifact_presentation_policy(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_current_principal_presentation(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_session_list_row_presentation(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_thread_create_visibility_plan(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_member_presentation(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_attachment_from_path(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_skill_pack_picker(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_skill_chips(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_capability_target(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_capability_menu_visibility(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_submission_plan(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_skill_rows_for_target(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_composer_filter_mcp_rows(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_thread_tree_refresh(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_thread_tree_level(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_active_thread_open(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_active_thread_open_by_id(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_active_thread_open_or_create_new(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_active_thread_send_text(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_prepare_voice_composer_snapshot(PioneerClientFfi* client, const char* input_json);
char* pioneer_client_ffi_active_thread_clear(PioneerClientFfi* client);
void pioneer_client_ffi_string_destroy(char* value);

#ifdef __cplusplus
}
#endif
