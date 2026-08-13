/**
 * Barrel de compatibilidad. Lógica segmentada en lib/notification-recipient/*.
 */
export {
  SPECIAL_RULE_KEYS,
  type SpecialRuleKey,
  type NotificationEventCatalogRow,
  type NotificationRecipientConfigRow,
  type RecipientConfigDraft,
  type UserAccessBadge,
  type UserAccessSnapshot,
  type EffectiveAccessSummary,
  type UserEventSubscriptionRow,
} from "@/lib/notification-recipient/types";

export {
  parse_recipient_config_row,
  parse_event_catalog_row,
  draft_from_event_and_config,
} from "@/lib/notification-recipient/parsers";

export {
  special_rule_label,
  user_is_member_of_app,
  evaluate_special_rules_for_user,
  count_active_special_rules,
  is_direct_target_only_event,
  type SpecialRuleEvaluation,
} from "@/lib/notification-recipient/special-rules";

export {
  role_label_for_key,
  get_user_role_keys,
  get_user_permission_slugs,
  compute_user_access_snapshot,
} from "@/lib/notification-recipient/access-snapshot";

export { build_effective_access_summary } from "@/lib/notification-recipient/access-summary";

export {
  get_department_effective_tri_state,
  toggle_department_access,
  toggle_user_access,
} from "@/lib/notification-recipient/access-toggles";

export {
  describe_user_subscription_conditions,
  set_user_event_subscription,
  build_user_subscription_row,
  type BuildUserSubscriptionRowInput,
} from "@/lib/notification-recipient/user-subscriptions";

export { trigger_kind_label } from "@/lib/notification-recipient/trigger-kind";
