use num_enum::TryFromPrimitive;
use strum_macros::{AsRefStr, IntoStaticStr};
#[repr(u16)]
#[derive(Debug, Copy, Clone, PartialEq, Eq, TryFromPrimitive, AsRefStr, IntoStaticStr)]
pub enum MessageId {
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreateCharacterRequest = 101u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreateCharacterResponse = 102u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoginRequest = 103u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoginResponse = 104u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterGameRequest = 105u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterGameResponse = 106u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReconnectRequest = 107u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReconnectResponse = 108u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoginNotify = 109u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LogoutNotify = 110u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ProtoKeyRequest = 111u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ProtoKeyResponse = 112u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PushDataCompleteNotify = 113u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExitGamePush = 114u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchNodeNotify = 115u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheckClientPush = 116u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HeartbeatRequest = 1650u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HeartbeatResponse = 1651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KcpConvRequest = 3728u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KcpConvResponse = 3729u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTalentSkillLevelResponse = 15004u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TutorialInfoRequest = 15006u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RunTurntableActivityRequest = 15007u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeadeyeShootHitRequest = 15008u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoStepAdvanceResponse = 15011u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyQuestGetRewardRequest = 15012u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PreheatSignSurveyInfoRequest = 15013u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleQuestStateNotify = 15015u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoonPhaseRewardResponse = 15018u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTalentUnlockResponse = 15025u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayCueResponse = 15031u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlItemEffectShowNotify = 15034u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatMaxCaseMessageResponse = 15035u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryResidentTaskRewardResponse = 15037u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssSelfPassResponse = 15039u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityStaticHookMoveResponse = 15040u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemPkgFullNotify = 15052u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationModifyRequest = 15057u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSceneItemBlackboardRequest = 15059u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFinishActionRequest = 15063u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlScoreRewardRequest = 15066u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoonPhaseRandomRequest = 15067u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolLoadRequest = 15073u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisLevelRewardRequest = 15075u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerChallengeSettleNotify = 15085u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightBossDropNotify = 15088u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAccessRangeResponse = 15094u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TetrisFinishRequest = 15095u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerRewardResponse = 15099u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestActionResponse = 15105u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerPsnSessionNotify = 15107u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SelectDetectionTargetResponse = 15118u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTechLevelUpResponse = 15127u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssPluginItemAddNotify = 15136u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReviveRequest = 15137u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayOpenResponse = 15142u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CancelMatchRequest = 15153u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MainPhantomRecommendRequest = 15154u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimePointActivityBatchRewardResponse = 15156u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneLoadingTimeOutNotify = 15159u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollDeliveryNotify = 15165u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DetectionInvisibleNotify = 15166u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolGalleryUpdateNotify = 15173u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConnectorConnectEntityResponse = 15177u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlRoleUnlockNotify = 15179u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GivebackInfoRequest = 15189u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueShopBuyRequest = 15194u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabPauseEndRequest = 15196u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    H5ViewActivityReadResponse = 15198u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffItemUpdateNotify = 15200u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoadingLevelAreaRequest = 15203u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SeamlessTeleportResponse = 15205u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonSettleRequest = 15206u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterGachaDataChangeNotify = 15207u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemUseRequest = 15211u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionOperationScreenSuccessRequest = 15213u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvoidBlockClientInitDoneRequest = 15216u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeSeasonDataRequest = 15218u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerSaveDeleteResponse = 15219u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomItemRemoveNotify = 15222u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopInstResponse = 15227u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CertificateLevelRewardRequest = 15228u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingTaskInfoUpdateNotify = 15232u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallItemBagObtainNotify = 15236u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballTeamDieRequest = 15247u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveReviveRegionRequest = 15252u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingShipFixRequest = 15255u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalDieResponse = 15258u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBdUpdateNotify = 15259u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityPointRequest = 15260u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DetectionRequest = 15268u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialReChallengeResponse = 15271u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaNewNotify = 15278u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlaceItemOnBoardNotify = 15283u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaptureEntityResponse = 15289u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerRecommendResponse = 15290u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScheduleRewardRequest = 15291u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryAreaInfoUpdateNotify = 15296u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaptureEntityRequest = 15300u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChapterResultRewardResponse = 15304u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmTaskUpdateNotify = 15309u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LongShanScoreRewardRequest = 15312u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerBattleStateChangeNotify = 15313u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerCycleStartResponse = 15315u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SkinRewardInfoUpdateNotify = 15316u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReadCardRequest = 15318u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrnamentInfoNotify = 15327u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssPluginSynthesisRequest = 15330u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeekCardRewardResponse = 15339u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingInstNotify = 15347u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportActivityTrialRoleUpdateV2Notify = 15348u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelSoarRewardRequest = 15351u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingGhostStateNotify = 15355u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightGameOverNotify = 15356u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PressRequest = 15361u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleTrackReportRequest = 15365u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingNoticeUpdateNotify = 15366u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopComposeResponse = 15368u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerStageSettleResponse = 15371u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenFullRewardRequest = 15385u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyCurrencyUpdateNotify = 15390u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientCurrentRoleReportResponse = 15392u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyJoinWorldResponse = 15396u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDealCardNotify = 15397u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NetTestDataNotify = 15406u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailGetAttachmentRequest = 15409u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceScoreRewardResponse = 15411u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportRewardTaskRequest = 15421u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockPointExitRequest = 15425u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemSetPosSenderNotify = 15429u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinResponse = 15433u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTaskRewardTakeResponse = 15438u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoShopRewardNotify = 15439u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportFlowEndResponse = 15441u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapUnlockFieldInfoRequest = 15442u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstanceTimerNotify = 15453u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SignActivityFreeDropResponse = 15457u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorUseSceneRequest = 15459u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeInfoNotify = 15467u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballTeamReviveResponse = 15477u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayShopBuyResponse = 15480u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockOpenGamePlayNotify = 15482u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedInfoRequest = 15484u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanSaveUsePlanRequest = 15491u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceVoteUpdateNotify = 15493u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTokenReceiveResponse = 15495u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AtomicProcessAddBuffResponse = 15504u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveBuffByServerIdS2cRequestNotify = 15505u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityCameraAlertRequest = 15507u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTrialRoleInfoResponse = 15508u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorTalkScoreResponse = 15509u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationGameplayTagPush = 15510u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DetectionTargetChangeNotify = 15512u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceSelfPassRequest = 15513u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RunTurntableActivityResponse = 15518u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestTreeInfoRequest = 15519u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockPointFinishRequest = 15520u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EquipSkinUnLoadResponse = 15525u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTrainRequest = 15533u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssLikeRequest = 15542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightSettleRequest = 15544u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballWeaponDegradeRequest = 15550u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponRemoveNotify = 15552u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockToggleHintRequest = 15560u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendApplySendResponse = 15562u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InviteRechallengeResponse = 15563u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeResultResponse = 15568u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueUpdateReviveTimesNotify = 15569u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendDeletedNotify = 15578u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SunSpiritListNotify = 15581u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DamageRecordNotify = 15583u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonBuildingDataResponse = 15600u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerVoxelEnvResponse = 15604u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchInviteRetToHostNotify = 15606u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillRouletteSetRequest = 15609u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterMatchInstResponse = 15610u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TargetGearHitResponse = 15616u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTalentInfoResponse = 15617u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicSwitchResponse = 15618u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleNpcShowOverResponse = 15620u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiBlackboardCdRequest = 15625u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessTakeResponse = 15626u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinWearAllRoleResponse = 15632u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchFlagNotify = 15636u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HoldHandRequest = 15637u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulPhantomBattleMasterLevelRewardResponse = 15639u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneAreaStateNotify = 15646u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlSaveMatchBriefNotify = 15653u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveActivityScoreResponse = 15654u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashMsgResponse = 15659u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrLibraryTaskUpdateNotify = 15668u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceQuestResponse = 15680u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookEquippedChangeNotify = 15683u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballTeamDieResponse = 15684u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsCloseSettleMenuRequest = 15685u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneChangeDataLayerNotify = 15688u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchConfirmResponse = 15699u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HoldWeaponNotify = 15700u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoItemUpdateNotify = 15702u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockMapBlockNotify = 15704u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStorySellItemResponse = 15708u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieAdventureTaskRewardResponse = 15720u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackScreenStatePush = 15727u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideInfoRequest = 15732u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyQuestChangePreferResponse = 15733u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBackLibraryResponse = 15743u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingExitResponse = 15747u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSkillFailPush = 15749u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchOperRequest = 15779u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestFinishActionResponse = 15780u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueSubLevelNotify = 15783u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyInstInfoNotify = 15788u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallMapMarkUpdateNotify = 15791u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScratchCardRewardResponse = 15806u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopRefreshResponse = 15810u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabTimeBallRequest = 15812u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityDynamicInteractRequest = 15821u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayGiftInfoResponse = 15822u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QueryOnlinePlayersAreaRequest = 15827u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SummonResponse = 15829u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoMemoryRewardResponse = 15832u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StorageInfoResponse = 15837u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CancelQuestFocusModeRequest = 15853u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ValidTimeItemUpdateNotify = 15855u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2FireUpdateNotify = 15857u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSkillFailRequest = 15861u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSkillRequest = 15873u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterBigWorldInstResponse = 15876u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetFocusModeDeterCondResponse = 15892u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseTechPointUpdateNotify = 15898u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorLevelOneKeyRewardRequest = 15900u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakRequest = 15909u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardUpdateNotify = 15912u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BulletPatternPush = 15914u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreateBulletNotify = 15915u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaDiscountNotify = 15918u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSoundBoxSkillRequest = 15919u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyOptionSelectResponse = 15921u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GivebackUnlockNotify = 15923u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HitEndPush = 15924u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SunSpiritActionOperationNotify = 15928u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PressNotify = 15929u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OperationRestrictionNotify = 15930u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveBuffByIdS2cResponsePush = 15939u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRoleRoomSelectResponse = 15944u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestTreeInfoResponse = 15945u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResMoveResponse = 15952u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledEntityHoverRequest = 15955u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageChatCharmChangeResponse = 15958u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleReconstructCardNotify = 15963u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderApplyBuffResponse = 15979u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddGuestNotify = 15984u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SitChairResponse = 15985u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoShopRewardLockResponse = 15987u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerSelfPassResponse = 15993u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsTaskNotify = 15994u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoFightSettleRequest = 15995u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveGameplayEffectRequest = 15998u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityResponse = 15999u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveWorldTeamRequest = 16004u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbRoleActiveNotify = 16014u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalAreaUnlockNotify = 16024u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitAwakeAndLoadEntityNodeResponse = 16025u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivateBuffPush = 16028u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFocusInfoNotify = 16030u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MowTowerLevelsInfoUpdateNotify = 16031u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstTeleportToResetPointResponse = 16034u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrPhoneTaskRewardRequest = 16037u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushResultNotify = 16040u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiControlSwitchNotify = 16041u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleMotionListNotify = 16046u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheatInputRequest = 16047u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    XboxSettingUpdateResponse = 16049u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangePhantomEquipGroupNameResponse = 16060u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementReceiveRequest = 16062u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupAddResponse = 16063u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemDecomposePreviewResponse = 16064u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerShowNameRequest = 16067u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestInstRewardRequest = 16068u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreatureDetailResponse = 16069u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneTempFishPointInfoUpdateNotify = 16073u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceRandListRequest = 16075u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityRequest = 16076u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecWorldSEndFlowRequest = 16078u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingShipInfoUpdateNotify = 16082u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryScoreRewardRequest = 16084u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResGotoNextRoomResponse = 16110u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerRewardResponse = 16113u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheckUseSoundBoxSkillRequest = 16116u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlInstEventSelectNotify = 16117u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseUseItemRequest = 16123u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportFlowEndRequest = 16124u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoStepAdvanceRequest = 16129u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopBuyNotify = 16134u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TetrisFinishResponse = 16139u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDevelopTaskRewardRequest = 16150u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardSelectRequest = 16151u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupDeleteRequest = 16154u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayStateRequest = 16155u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangePlayerUiStateNotify = 16156u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalUpdateNotify = 16164u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueQuitResponse = 16168u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCourseV2RewardResponse = 16170u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetQuestFocusModeRequest = 16174u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageReadResponse = 16177u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicInfoRequest = 16180u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CountryExploreScoreInfoRequest = 16184u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustRefreshResponse = 16187u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestBuffUnlockNotify = 16190u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityFlyEquipChangeNotify = 16196u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CharacterBattleStateChangeNotify = 16199u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockInstEntranceRequest = 16204u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InitRangeRequest = 16207u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommonUiSettingNotify = 16208u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabPauseStartRequest = 16209u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerUpdateRecordRequest = 16212u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyRewardRequest = 16216u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityLevelDiffRequest = 16220u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VfxNpcPatrolFinishResponse = 16241u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExitViewDirectionRequest = 16245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryItemCollectionInfoUpdateNotify = 16250u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConditionGroupStateResponse = 16252u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemExchangeInfoRequest = 16256u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerPsnBlockListRequest = 16257u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseAuxiliaryBranchRequest = 16263u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleConfigInfoUpdateNotify = 16265u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientVersionNoMatchNotify = 16267u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingExitRequest = 16269u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsGearRequest = 16270u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeekCardInfoResponse = 16279u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamParkourSettleNotify = 16281u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapRemoveMarkRequest = 16284u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceRankShowNameRequest = 16285u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDiscardCardRequest = 16286u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetNpcPerformStateNotify = 16291u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifyNameResponse = 16293u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ValidTimeItemResponse = 16298u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatHistoryNotify = 16299u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveBuffS2cResponsePush = 16300u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockPointRequest = 16301u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayTagResponse = 16302u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerFormationRecommendRequest = 16303u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupAddRequest = 16307u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyQuestUnlockAreaNotify = 16310u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleEnterSlotResponse = 16311u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommitBoardResponse = 16328u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicInfoResponse = 16334u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneStepInfoNotify = 16336u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FixToolRequest = 16354u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivitySettleInfoNotify = 16355u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbRoleSkillLevelNotify = 16361u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceChallengeQuitResponse = 16362u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeLockInfoNotify = 16370u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionOperationScreenNotify = 16381u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomEquipGroupInfoNotify = 16384u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DragonPoolConfResponse = 16385u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolChangeDirRequest = 16389u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueInfoNotify = 16398u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    H5CircumFluenceActivityDataNotify = 16402u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchRoundActionRequest = 16403u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleUpdateEntityNotify = 16415u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EquipSkinTakeOnRequest = 16426u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledThrowResponse = 16431u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulMapTravelTaskRewardResponse = 16436u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffStackCountResponse = 16438u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DestroyRecallQuestsNotify = 16440u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestBuffCountRewardRequest = 16445u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AwakeItemVehicleResponse = 16446u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockToggleHintResponse = 16448u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleGoDownPush = 16452u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResGridEventRequest = 16464u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetLevelPlayRewardsRequest = 16467u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoRoleUnlockNotify = 16470u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DamageExecuteResponse = 16478u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryActivateTalentResponse = 16479u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollDeliveryResponse = 16482u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimelineTraceExitResponse = 16487u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreActivityTaskInfoNotify = 16491u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleAreaSkillNotify = 16501u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopItemUpdateResponse = 16503u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinChangeNotify = 16509u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OccupationInfoNotify = 16517u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoShopRewardRefreshResponse = 16518u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatOperateRequest = 16521u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InvestRequest = 16522u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakTimeResponse = 16525u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballTaskRewardResponse = 16536u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoEndSpecialWaveCombatRequest = 16538u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeTransResponse = 16542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneSubLevelsRequest = 16545u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LinkExitNotify = 16547u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTalentUnlockRequest = 16548u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerConsumeItemResponse = 16552u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LogicStateInitNotify = 16553u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayRemoveUnitResponse = 16556u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEntityDieResponse = 16558u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightSelectBuffGateRequest = 16560u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifySignatureRequest = 16561u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DrownNotify = 16564u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRefreshNextWaveGroupRequest = 16568u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerRankListResponse = 16572u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveWorldTeamResponse = 16579u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopRequest = 16580u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MowTowerLevelsRewardRequest = 16582u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResOpDoneResponse = 16584u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyLastInfoResponse = 16590u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallItemBagRemoveNotify = 16591u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomReturnRequest = 16594u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseChallengeUpdateNotify = 16595u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulRogueWeeklyRewardRequest = 16599u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombineEntitiesResponse = 16600u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerTaskRewardResponse = 16607u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeleteStoryCharacterResponse = 16614u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayGiftRequest = 16617u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookInfoRequest = 16618u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreToolAuthorizationNotify = 16622u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlFightOverResponse = 16631u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponAllInfoNotify = 16632u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyArtifactInfoResponse = 16633u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerRenameNotify = 16634u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEntityAttributeUpdateNotify = 16636u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnergySyncResponse = 16637u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceEntityPosResponse = 16641u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LogicStateInitPush = 16642u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopUnlockNotify = 16644u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExitViewDirectionPush = 16646u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeDataLayerFinishRequest = 16648u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvignonRewardRequest = 16650u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressTrialRoleLvUpRequest = 16654u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameStatsShowRequest = 16656u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DestroyBulletNotify = 16659u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleReconstructCardResponse = 16661u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieAdventureChapterDropRequest = 16662u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    XboxSettingResponse = 16665u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BathPhotoResponse = 16666u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityHonamiStoryEnhanceLevelNotify = 16677u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomItemUpdateNotify = 16679u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStorySellItemRequest = 16688u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingCageInfoResponse = 16693u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SeamlessTeleportVehicleRequest = 16695u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiBlackboardsPush = 16697u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkShowIdInfoUpdateNotify = 16700u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayItemRequest = 16704u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeStopPush = 16707u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AllApplyJoinNotify = 16708u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefensePreviewFinishRequest = 16711u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRefreshCollectionTimesChangeNotify = 16712u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamChallengeRequest = 16714u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeletePhantomEquipGroupResponse = 16721u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoChestRewardSelectRequest = 16722u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTrialCloseNotify = 16731u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2TaskRewardResponse = 16735u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerCreatePsnSessionResponse = 16742u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResInstOptionsNotify = 16744u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdatePlayersFightRolesInfoNotify = 16745u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseDevelopInfoUpdateNotify = 16748u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ZitherPlayNotePush = 16749u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResEndingUpdateNotify = 16750u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialSelectBossNotify = 16751u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeOrnamentRequest = 16754u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationChangeRequest = 16758u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorCreateResponse = 16761u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatMessagePrefixInfoResponse = 16765u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookDeletePresetResponse = 16772u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomFormationChangeNotify = 16773u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecFBRoundEndFlowReportResponse = 16776u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerGuideActivityRewardRequest = 16778u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulMapTravelSoarRewardResponse = 16779u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledRequest = 16785u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BehaviorTreeInfoNotify = 16786u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThroughTrainFinishViewRequest = 16804u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookFullChangeNotify = 16805u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScratchCardCountInfoNotify = 16808u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerCycleStartRequest = 16812u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRepeatedTaskRewardResponse = 16815u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchRoleResponse = 16820u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SignActivityKeepTimeNotify = 16823u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieAdventureRoleRewardRequest = 16825u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneModeChangeFinishRequest = 16826u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowSeqSetPlayerPosResponse = 16827u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballBonusFullWinResponse = 16828u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponBreachRequest = 16833u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleQuestNewUnlockNotify = 16834u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorIsEnablePush = 16848u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifyBulletParamsPush = 16856u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightLastSaveDataRequest = 16858u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddTreasureBoxSlotResponse = 16859u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaughtPush = 16870u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkRequest = 16871u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessStartNewRequest = 16872u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActorVisiblePush = 16875u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AgreeJoinResultRequest = 16876u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationAttrNotify = 16879u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceContentUpdateNotify = 16880u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoResTaskReceiveRequest = 16881u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightKillResponse = 16884u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityElementalAbilityEnableNotify = 16885u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolTaskUpdateNotify = 16887u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleUpdateDevelopTargetResponse = 16891u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLimitShopConsumeNumNotify = 16893u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamRecommendResponse = 16900u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymBeginRequest = 16902u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSkillBombResponse = 16903u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ForgeInfoRequest = 16907u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetFanStateRequest = 16914u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlInstBaseNotify = 16916u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemSequenceFrameStartResponse = 16917u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryUnlockSlotResponse = 16925u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RolePropResponse = 16928u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemExchangeRequest = 16929u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StopHoldHandNotify = 16932u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorParkourLevelRewardUpdateNotify = 16941u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueEventNotify = 16943u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ANStartNotify = 16944u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSceneGroupDataRequest = 16945u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldLevelPlayRepeatedResponse = 16947u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExecuteQtePush = 16952u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DirectTrainInfoUpdateNotify = 16954u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorSliderResponse = 16957u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DamageShowNotify = 16964u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestStatusUpdateNotify = 16968u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuildingBranchResponse = 16970u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueBlessGroupSelectResponse = 16971u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VisionExploreSkillSetRequest = 16974u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2ManualCancelTraceTreeResponse = 16976u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoRoleRecordResponse = 16983u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardRoleSkillRequest = 16984u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RenjuResetRequest = 16999u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryInstInfoNotify = 17000u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignDrawRewardRequest = 17001u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NetTestDataRequest = 17003u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThirdPartyShareRequest = 17006u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WuWuKujiGachaResponse = 17008u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchCharacterStatePush = 17009u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayGachaRefreshRequest = 17012u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeLastInfoRequest = 17013u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldLevelDownRequest = 17014u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateChangedRequest = 17015u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SelfPortraitStateRequest = 17018u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomUpdateNotify = 17025u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueLootInfoResponse = 17028u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SettingNotify = 17038u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MaterialReplaceResponse = 17042u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PartComponentInitResponse = 17051u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleActivateSkillResponse = 17055u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportTrialRoleLvUpV2Request = 17058u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponLevelUpResponse = 17061u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchLogicStateRequest = 17062u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterBigWorldInstRequest = 17063u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SummonRandomResponse = 17070u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomEquipGroupInfosResponse = 17071u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicSaveRequest = 17072u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieAdventureRoleRewardResponse = 17073u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DodgeInfoPush = 17078u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashDevelopRewardUnlockNotify = 17081u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballTaskRewardRequest = 17084u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryRoleUpdateNotify = 17089u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemPkgOpenNotify = 17095u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneRoadSyncNotify = 17096u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonTargetRewardResponse = 17100u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendApplyReceivedNotify = 17101u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SilenceNpcNotify = 17104u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerXboxInfoGetRequest = 17106u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeSceneModeEndNotify = 17107u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThirdPartySharedNotify = 17110u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JoinWorldTeamNotify = 17115u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchPolishRequest = 17121u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingShipSkinChangeRequest = 17127u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerFloorUpdateNotify = 17128u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConstructTrapRequest = 17132u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AwakeDynamicPortalResponse = 17133u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MiniWriteLetterSaveContentResponse = 17140u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddUnlockedDetectionTextNotify = 17144u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchRoundRequest = 17145u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTaskTakeResponse = 17148u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnergySyncRequest = 17150u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbOverRoleRequest = 17152u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CancelMatchResponse = 17155u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabPauseEndResponse = 17158u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAccessCasketRequest = 17160u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterAreaResponse = 17162u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterBoomRequest = 17163u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveSummonEntityRequest = 17165u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeEventGainNotify = 17169u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinAllUnLoadRequest = 17171u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponSkinAddNotify = 17173u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsUpdateOddsRequest = 17175u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryItemCollectionResponse = 17176u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressTaskRequest = 17178u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2InfoNotify = 17182u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAddDynamicInteractNotify = 17186u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopUpdateRequest = 17187u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayTagInitNotify = 17191u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    XboxSettingRequest = 17199u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapCancelTraceRequest = 17205u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2TreeBuildRequest = 17207u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneStepGroupInfoNotify = 17210u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayRewardResponse = 17215u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestReadyForGiveUpRequest = 17217u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassPaidNotify = 17219u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceMoonPhaseRewardResponse = 17223u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MowTowerLevelsRewardResponse = 17233u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LinkageCheckInRewardRequest = 17237u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSlotInsteadResponse = 17240u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ValidTimeItemRequest = 17241u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResFovUpdateNotify = 17242u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StorageInfoNotify = 17245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpecialItemEquipResponse = 17256u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookRegionInfoNotify = 17258u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsGearRefundResponse = 17259u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryPickUpItemRequest = 17260u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuickHackSkillResponse = 17263u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyArtifactSelectResponse = 17264u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueChooseDataNotify = 17268u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFinishActionResponse = 17278u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballWeaponWearResponse = 17279u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayFastReturnPosResponse = 17289u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ContextIdNotify = 17290u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeOccupationNotify = 17295u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemAttributeChangeNotify = 17296u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingHandInRequest = 17299u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifyBulletParamsResponse = 17302u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetInitTagResponse = 17305u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerOverNotify = 17309u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuildingBranchRequest = 17310u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerLastCycleInfoResponse = 17319u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsResultRequest = 17323u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerPsnBlockListResponse = 17327u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitWalkingPatternPointRequest = 17328u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CiacconaActivityStateUnlockUpdateNotify = 17332u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResonantChainUnlockRequest = 17339u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddPhantomEquipGroupResponse = 17340u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDecalTaskRequest = 17341u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReceivedSilentFirstAwardRequest = 17342u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryWeaponDressRequest = 17346u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupInfoNotify = 17347u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmMainLineInfoRequest = 17348u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockInputResponse = 17349u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateMonsterUnlockNotify = 17351u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbUpLevelRoleRequest = 17360u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleLevelUpViewResponse = 17361u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangeReadyNotify = 17363u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestStarRewardResponse = 17366u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillActionRequest = 17369u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeStateConfirmRequest = 17371u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssReviveCharacterResponse = 17377u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneGamePlayOpenTimeNotify = 17378u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthDayRewardRequest = 17381u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRoleInfoUpdateNotify = 17390u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillViewResponse = 17396u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheckPublicResourceVersionRequest = 17400u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetYuXueModeInfoResponse = 17403u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseRefreshShopRequest = 17409u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportDungeonActionRequest = 17415u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NormalItemRequest = 17423u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendDeleteResponse = 17425u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MutiplayerTeamRefreshNearListRequest = 17426u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoveSplineStatusNotify = 17431u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoWeaponUnlockNotify = 17432u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyBuffS2cResponsePush = 17435u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JoinSceneNotifyConfirmResponse = 17440u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyGameplayEffectPush = 17445u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalAtmosphereRewardResponse = 17452u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SkillResponse = 17453u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulCalabashLevelRewardRequest = 17463u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlientFirstAwardNotify = 17464u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushLevelScoreRewardResponse = 17469u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FollowDetectionTargetUpdateNotify = 17471u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillAddRequest = 17475u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponResonUpRequest = 17476u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchConfirmRequest = 17484u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeChooseDataResponse = 17486u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityInstInfoNotify = 17488u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HitRequest = 17489u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchInviteResponse = 17491u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResEndingRewardResponse = 17493u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymLevelPlayResultNotify = 17494u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyAdventureTaskRewardResponse = 17499u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushClaimRewardRequest = 17500u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayTagRequest = 17502u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlBagOperateResponse = 17507u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDebugInfoResponse = 17509u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuyShopProductRequest = 17521u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemStateResponse = 17526u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulCalabashLevelRewardResponse = 17527u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceRankShowNameResponse = 17528u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleChallengeInfoUpdateNotify = 17529u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MaterialRequest = 17530u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleElementChangeResponse = 17531u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnOpenedAreaPullbackRequest = 17532u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledNotify = 17537u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerLastCycleInfoRequest = 17540u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoralePosRequest = 17542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSexChangeRequest = 17543u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportToTargetResponse = 17547u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTalentInfoRequest = 17548u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrLevelUpResponse = 17552u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTechTreeSwitchResponse = 17554u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTaskUpdateNotify = 17567u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemDecomposeRequest = 17570u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DetectionResponse = 17575u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SelectBabelActivityDeTermRequest = 17576u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbRolePropsNotify = 17579u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AccessPasserbyNpcSpawnerResponse = 17585u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingPortUpdateNotify = 17589u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActorVisibleRequest = 17594u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InvalidItemRequest = 17597u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorLevelOneKeyRewardResponse = 17604u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitAwakeAndLoadEntityNodeRequest = 17608u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyBuffS2cRequestNotify = 17614u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateEnableSystemNotify = 17615u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleActivateSkillRequest = 17616u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalScoreRewardRequest = 17619u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerAoiRangeNotify = 17622u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoFightResultNotify = 17633u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewJourneyResponse = 17635u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardTargetInfoResponse = 17636u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdventureManualRequest = 17641u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewBieCourseRewardResponse = 17644u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollDeliveryRequest = 17654u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinWearAllRoleRequest = 17655u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MowTowerResultNotify = 17664u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerMotionRequest = 17665u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AudioStateUpdateNotify = 17667u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessRefreshNotify = 17669u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleStateChangeNotify = 17671u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTrialOpenNotify = 17675u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrManualCancelTraceRoadRequest = 17676u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyAdventurePtRewardResponse = 17678u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapCancelTraceNotify = 17682u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SelectBabelActivityDeTermResponse = 17683u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerAttrNotify = 17685u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyJoinWorldRequest = 17687u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CdKeyVerifyRequest = 17701u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecWorldSEndFlowResponse = 17703u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerXboxBlockListRequest = 17705u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaughtRequest = 17706u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchCharacterStateNotify = 17711u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryBagOperateResponse = 17717u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpecialItemEquipRequest = 17718u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleFinishResponse = 17721u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestLockInfoNotify = 17725u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabPauseStartResponse = 17732u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderRemoveBuffResponse = 17733u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffStackCountPush = 17747u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatDataRequest = 17748u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopConditionFinishNotify = 17751u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiHateNotify = 17752u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SheriffAnomalyInfoUpdateNotify = 17753u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionGroupCompleteNotify = 17755u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FunPlayChallengeSettleNotify = 17763u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResonantChainOptionalLimitRequest = 17766u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatMessagePostInfoRequest = 17769u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanUsePlanResponse = 17771u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VisionExploreSkillNotify = 17772u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantModelEnableNotify = 17776u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DecalAddNotify = 17780u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerConsumeItemRequest = 17781u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2TaskRewardRequest = 17782u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFinishListNotify = 17785u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillNotify = 17786u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecoverPropChangedNotify = 17789u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockSwitchControlBlockRequest = 17791u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShowInvalidItemResponse = 17796u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InvestResponse = 17799u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoSystemInfoNotify = 17800u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateInstanceTimerNotify = 17805u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationGameplayTagNotify = 17808u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorInfoRequest = 17813u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecWorldStartFlowResponse = 17814u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryPollutionBoxSteadyLimitNotify = 17818u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffItemRequest = 17824u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabRequest = 17827u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleShareNotify = 17830u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerTaskRewardResponse = 17834u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorAnimReplaySampleUdpNotify = 17840u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetClientGlobalVarResponse = 17849u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTrialRoleGetNightmarePhantomInstInfoRequest = 17854u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoLevelDataUpdateNotify = 17855u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayStateListRequest = 17858u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTechUnlockNotify = 17862u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityUpdateNotify = 17864u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTalentUnlockNotify = 17875u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingSettleResponse = 17879u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonthCardUseNotify = 17882u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    XboxSettingUpdateRequest = 17883u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponSkinUnLoadNotify = 17893u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityInteractingNotify = 17894u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeamReceiveNotify = 17895u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LifePointChallengeStartRequest = 17900u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SeamlessTeleportRequest = 17907u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadNetworkEntityUpdateCurRoadPush = 17914u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsChallengeInfoUpdateNotify = 17917u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailFavoriteResponse = 17919u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorAcceptQuestResponse = 17922u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityRemoveNotify = 17927u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedRedDotRequest = 17930u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsTaskRewardRequest = 17938u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerCreateXboxSessionResponse = 17939u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneFishPointInfoUpdateNotify = 17940u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FeiXuePreheatInfoRewardRequest = 17951u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecFBRoundEndFlowReportRequest = 17956u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TotalTopUpRewardNotify = 17958u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBlackboardNotify = 17963u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityEquipSkinChangeNotify = 17965u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageInfoResponse = 17966u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightAddEnemyBuffNotify = 17969u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WuWuPackageRewardResponse = 17971u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayVarRequest = 17974u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConnectorCanConnectResponse = 17977u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveEntityAoiNotify = 17978u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterDetectionInfoResponse = 17979u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MovePackageNotify = 17980u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanSetFiveStarSwitchRequest = 17981u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabResponse = 17987u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStorySafeLeaveNotify = 17990u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayTagChangedNotify = 17995u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityResultRewardResponse = 18003u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GolemCrackUpdateRequest = 18010u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveActivityInfoResponse = 18014u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestActivityUpdateNotify = 18015u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmConditionPassResponse = 18028u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballInGameSyncPayloadRequest = 18030u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolLoadResponse = 18031u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StartRecallRequest = 18032u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveCombineRelationNotify = 18044u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DragonPoolConfRequest = 18045u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyTaskAddNotify = 18048u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicCollectUpdateResponse = 18049u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtGiveUpRequest = 18051u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceDeleteRequest = 18057u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeSubLevelNotify = 18059u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InitRangeResponse = 18075u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceVoteResponse = 18076u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchUnlockTechPointResponse = 18079u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommonOrganResetTimeResponse = 18085u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemObtainNotify = 18089u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTokenReceiveRequest = 18099u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerNetStateS2cNotify = 18103u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorLevelUpdateNotify = 18110u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRankListSelfDataResponse = 18113u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EndSkillPush = 18120u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsOpDoneResponse = 18127u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyNextBoardResponse = 18128u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuildingLevelUpRequest = 18133u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttributeInitRequest = 18143u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityPreOpenRequest = 18144u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBoardInfoNotify = 18147u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerLevelPlayNotify = 18154u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopInstRequest = 18157u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockSplitHumanSwitchStateNotify = 18158u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceModifyResponse = 18162u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestActionRequest = 18164u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRoleRoomSelectRequest = 18165u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TutorialReceiveResponse = 18170u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessStartNewResponse = 18171u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveGameplayEffectNotify = 18172u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomAttrRecommendRequest = 18178u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerChallengeSettleResponse = 18185u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabStopRequest = 18186u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayRefreshShopResponse = 18191u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorParkourLevelRewardRequest = 18192u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomInteractionSkinChangeResponse = 18194u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerHeadRequest = 18199u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignDrawRoleRequest = 18204u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisLevelUpdateNotify = 18205u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseEntityDataChangeNotify = 18208u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstDataNotify = 18211u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LowMemoryChangeSceneFinishResponse = 18214u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeRoomInfoNotify = 18217u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRefreshCollectionResponse = 18221u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ButtonIsEnableRequest = 18232u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerTokenUpdateNotify = 18236u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantActivityNodeActiveNotify = 18243u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkRoleInviteResponse = 18245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreateBulletRequest = 18246u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoGoldAddRequest = 18249u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSelectGainingGroupRequest = 18252u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CorniceMeetingRewardResponse = 18253u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeSeasonRewardReceiveResponse = 18258u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRoleInstStartResponse = 18259u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LogicStateInitRequest = 18260u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrFireUpdateNotify = 18262u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtRollbackNotify = 18266u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmSettleRequest = 18268u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEntityBuffUpdateNotify = 18273u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleQuestAcceptRequest = 18275u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomReturnPreviewRequest = 18276u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayGachaRequest = 18280u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoUpgradeRewardNotify = 18286u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemGiftUseNotify = 18287u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSellRequest = 18289u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorExpTipsNotify = 18293u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantDeliveryItemResponse = 18294u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehiclePlatformGetOnResponse = 18298u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerScoreRewardResponse = 18302u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFinishActionEndResponse = 18310u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityRemoveDynamicInteractNotify = 18312u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimePointActivityRewardResponse = 18317u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestListNotify = 18320u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTeamLevelUpdateNotify = 18322u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SheriffZoneItemUpdateNotify = 18326u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityRandomInteractRequest = 18332u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResLastInstInfoResponse = 18335u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestFinishActionEndResponse = 18345u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOnlineProgressReportPush = 18346u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelFullRewardResponse = 18348u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightAddBuffNotify = 18353u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CorniceChallengeEndNotify = 18364u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookInfoResponse = 18366u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TotalTopUpScoreInfoRequest = 18368u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowerPollutionSplinePush = 18370u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveMatchTeamResponse = 18375u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VisionExploreSkillSetResponse = 18378u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeekCardRewardRequest = 18381u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CorniceMeetingRewardRequest = 18385u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GaSwitchCommonEnemyProCampRequest = 18387u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoonPhaseRandomResponse = 18392u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchResponse = 18394u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrFireAddNotify = 18395u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSkillTeleportRequest = 18398u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessPlayCardRequest = 18401u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifyNameRequest = 18421u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockSplitHumanFullNotify = 18425u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TurntableCompleteResponse = 18435u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchInviteRequest = 18437u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingInfoRequest = 18438u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulPhantomBattleMasterLevelRewardRequest = 18455u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrPhoneTaskRewardResponse = 18459u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchLogicStatePush = 18461u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerSeasonTaskDataUpdateRequest = 18463u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportDataRequest = 18464u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BoneVisibleChangeRequest = 18467u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupNameRequest = 18469u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolSaveRequest = 18477u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockChangePush = 18483u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyRewardNotify = 18485u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolTaskProgressRewardResponse = 18486u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaPoolDetailResponse = 18488u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeQuitResponse = 18512u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerApplyFloorDataResponse = 18513u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementGroupProgressNotify = 18514u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardRewardInfoUpdateNotify = 18519u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRoundOverResponse = 18522u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashSkinUpdateNotify = 18523u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationGameplayTagResponse = 18524u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DiscardWeaponRequest = 18527u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeQuitRequest = 18528u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TriggerExitSkillResponse = 18531u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PartComponentInitRequest = 18536u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmSettleResponse = 18537u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FuncOpenUpdateNotify = 18542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmCustomBlackboardNotify = 18543u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSystemInfoUpdateNotify = 18546u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueGainDataUpdateNotify = 18551u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopDirectBuyNotify = 18553u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetChapterRewardResponse = 18554u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseQuickEquipRequest = 18555u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WuWuPackageRewardRequest = 18557u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerRewardTaskReceiveResponse = 18563u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbRoleScenePropsNotify = 18564u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantResponseNotify = 18571u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CancelMatchNotify = 18579u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBurnBuffNotify = 18581u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBackSlotCardLibraryRequest = 18589u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuildingResetRequest = 18594u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffEffectExecutePush = 18599u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConfirmResourceQuestNotify = 18602u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityDisableNotify = 18605u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryScoreRewardInfoUpdateNotify = 18607u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightScoreNotify = 18613u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopInfoNotify = 18614u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkResponse = 18621u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationChangeResponse = 18622u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiBlackboardCdPush = 18641u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchRefiningResponse = 18643u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlSettleNotify = 18644u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoadCalabashSkinInfoResponse = 18646u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmSubLevelUpdateNotify = 18647u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestInstUpdateNotify = 18648u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ArtemisNodeUpdateResponse = 18649u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorUnLockRequest = 18650u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueEventSelectResponse = 18651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStorySetFormationNotify = 18653u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DamageExecuteRequest = 18654u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OccupyRewardRequest = 18660u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExhibitionItemSaveResponse = 18661u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRoomInfoNotify = 18663u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendApplyDeletedNotify = 18666u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetFormationDataResponse = 18668u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoReChallengeResponse = 18670u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchBattleModeRequest = 18672u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingHandInResponse = 18677u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiInformationRequest = 18681u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportDungeonActionResponse = 18689u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewBieCourseRewardNotify = 18692u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSkinUnlockNotify = 18702u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScheduleRewardUpdateNotify = 18703u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LobbyListResponse = 18705u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightOneKeyRewardResponse = 18713u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetPlayerYuXueModeRequest = 18715u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleChangeNotify = 18718u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamParkourTaskNotify = 18720u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceScoreRewardRequest = 18725u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorAnimReplaySampleUdpPush = 18728u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicCollectUpdateRequest = 18730u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeChooseDataResultRequest = 18731u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeEntityStateRequest = 18733u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenFullRewardResponse = 18737u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RenameFormationResponse = 18743u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ForgeInfoResponse = 18747u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideCondDoneNotify = 18752u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatValNotify = 18757u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseGetSpecialRewardRequest = 18758u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstPlayDataNotify = 18768u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyGridRewardResponse = 18776u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoFightLevelInfoNotify = 18787u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SignActivityResponse = 18799u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrLevelUpRequest = 18803u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorSummonAndRidePush = 18805u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessUseSkillRequest = 18807u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTalentInfoRequest = 18812u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneGamePlayScopeNotify = 18816u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityUseReviveCountNotify = 18819u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayGachaRefreshResponse = 18822u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationModifyResponse = 18825u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UDPMovePackagePush = 18826u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyRoomInfoNotify = 18827u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeSeasonDataResponse = 18829u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatRequest = 18832u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheckUseSoundBoxSkillResponse = 18835u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueInstExtraInfoUpdateNotify = 18838u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerGameTokenRequest = 18839u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssShowNameResponse = 18840u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorTalkScoreRequest = 18847u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallItemUseRequest = 18849u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreScoreRewardResponse = 18852u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchWeeklyRequest = 18853u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MovePackagePush = 18855u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OnlineMotorActivityLevelResponse = 18856u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightSelectCollectionResponse = 18857u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceRoleReviveNotify = 18859u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleStartRequest = 18864u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabTimeBallResponse = 18865u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddPhantomEquipGroupRequest = 18869u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterInstRequest = 18872u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttachEntityResponse = 18874u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleQuestAcceptResponse = 18875u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChannelChatRequest = 18878u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldPointRepeatedResponse = 18879u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceInstanceInfoUpdateNotify = 18881u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBuffProducerRequest = 18892u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifySignatureResponse = 18895u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerAccessCasketResponse = 18900u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeChooseDataResultResponse = 18902u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThemePersonalScoreResponse = 18903u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueShopUpdateNotify = 18904u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangePhantomEquipGroupNameRequest = 18907u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleConfigInfoNotify = 18911u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSkillTeleportResponse = 18913u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBuffProducerResponse = 18914u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorActiveNotify = 18931u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterInstResponse = 18932u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeScheduleIdleNotify = 18933u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttributeInitResponse = 18934u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeCheckNotify = 18938u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameStatsShowResponse = 18943u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrArchiveTaskRewardRequest = 18945u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingTechLevelUpRequest = 18947u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustAcceptResponse = 18952u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardRoleSkillResponse = 18955u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThrowDamageNotify = 18961u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageItemUpdateNotify = 18965u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveGuestNotify = 18978u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyStartResponse = 18980u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TemplateEntitySpawnerContentNotify = 18989u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ElevatorStateChangeResponse = 19002u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GatherClueInfoNotify = 19010u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportActivityTaskUpdateNotify = 19012u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolStartResponse = 19013u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueGiveUpGainResponse = 19016u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttributeChangedRequest = 19018u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerBasicInfoGetResponse = 19022u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddReviveRegionResponse = 19029u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetInitTagRequest = 19030u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityResultResponse = 19031u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ZitherPlayNoteNotify = 19034u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerChallengeSettleRequest = 19036u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientCurrentRoleReportRequest = 19037u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoReChallengeCountNotify = 19047u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockHeadFrameNotify = 19052u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayWeeklyEndNotify = 19055u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialReChallengeNotify = 19059u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerAccessCasketRequest = 19061u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackSwordChallengeMarkItemPanelInfoResponse = 19063u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchActionRequest = 19065u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessRequest = 19066u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallItemUseResponse = 19067u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerCreateXboxSessionRequest = 19073u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddOccupationInfoNotify = 19074u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollSmallMapInfoResponse = 19076u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedReadRequest = 19077u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsUpdateOddsResponse = 19078u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeRewardRequest = 19079u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResIllustrationAwardRequest = 19081u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushChooseBuffResponse = 19084u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DirectTrainInfoResponse = 19087u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BatchSynthesisItemRequest = 19088u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FuncOpenNotify = 19093u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomIdentifyResponse = 19102u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FuncOpenConfirmNotify = 19104u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkSettleResponse = 19105u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChannelChatMessageNotify = 19107u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UsePhantomEquipGroupResponse = 19113u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientBasicInfoResponse = 19121u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchRoundResponse = 19125u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBoardSettleNotify = 19126u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyResultNotify = 19127u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryResidentTaskInfoUpdateNotify = 19128u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HitEndRequest = 19130u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingActivityMileStoneNotify = 19138u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveAoiNotify = 19141u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivateBuffResponse = 19166u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeStateNotify = 19168u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCarnivalAwardResponse = 19176u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestReadyForGiveUpResponse = 19178u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GivebackInfoResponse = 19180u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementFinishResponse = 19182u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightSettleResponse = 19184u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamRecommendRequest = 19191u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityFirstReadResponse = 19193u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendRemarkRequest = 19201u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstTeleportToResetPointRequest = 19204u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerClearRecordResponse = 19209u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialResultResponse = 19217u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyNextBoardRequest = 19220u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddSysBuffNotify = 19225u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MontagePlayNotify = 19227u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportSetCurUseTrialRoleV2Response = 19230u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaRequest = 19232u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestListNotify = 19235u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponLevelUpRequest = 19242u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightSelectCollectionRequest = 19245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    YuXueModeInfoNotify = 19246u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResMoodRangeUpdateNotify = 19251u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlaySelectCardGroupResponse = 19257u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetLevelPlayRewardsResponse = 19260u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTrialRoleInfoRequest = 19261u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRoundChangeNotify = 19265u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AtomicProcessRemoveBuffRequest = 19269u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityFirstReadRequest = 19271u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayStateNotify = 19272u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicNotify = 19275u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardSelectResponse = 19276u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GmEntityFsmGroupInfoResponse = 19279u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstEntranceDetailRequest = 19282u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSelectReserveCardNotify = 19284u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestRedDotNotify = 19285u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsoleNotify = 19286u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldBlackboardResponse = 19301u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThroughTrainFinishViewResponse = 19302u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HardnessModeChangedRequest = 19311u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityHeadInfoNotify = 19315u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffStackCountNotify = 19317u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendApplySendRequest = 19323u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtSetTimerInfoRequest = 19327u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestNpcMoveOverResponse = 19333u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieAdventureChapterDropResponse = 19337u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballBonusFullWinRequest = 19347u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessPlayCardResponse = 19352u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddForbidControlNotify = 19356u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeResetNotify = 19363u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockInputRequest = 19364u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreActivityTaskRewardResponse = 19374u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LinkageCheckInRewardResponse = 19375u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueBlackFlowerResponse = 19376u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingPointInfoResponse = 19378u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreateBulletResponse = 19384u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleStateChangePush = 19385u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSceneItemBlackboardResponse = 19386u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupUpdateResponse = 19388u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballUpdateNotify = 19395u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeWeatherResponse = 19397u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportSetCurUseTrialRoleV2Request = 19403u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardUnlockRequest = 19404u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FinishDownloadQuestResourceResponse = 19405u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyDiceRequest = 19414u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeWriteCatBossRewardRequest = 19415u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageInfoRequest = 19425u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffItemNotify = 19426u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestNpcMoveOverRequest = 19428u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchBattleModeResponse = 19436u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResGainDataTotalNotify = 19437u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashLevelsRewardNotify = 19440u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestBranchSelectRequest = 19447u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseCurChallengeInfoResponse = 19452u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonEntrustDataResponse = 19470u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlEventSelectRequest = 19472u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTrialRoleGetNightmarePhantomInstInfoResponse = 19481u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueLootInfoRequest = 19483u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueResultNotify = 19486u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageUpdateResponse = 19489u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SystemMarkHideInfoNotify = 19492u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBvBFightNotify = 19494u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsScoreAwardRequest = 19499u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationAttrRequest = 19501u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssReviveCharacterRequest = 19506u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PostAkEventNotify = 19508u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefencePhantomInfoUpdateNotify = 19510u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CdKeyVerifyResponse = 19513u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoUpgradeRewardRefreshRequest = 19521u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfluenceRewardRequest = 19523u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerRewardRequest = 19524u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBlackboardRequest = 19528u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopBuyResponse = 19539u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterLevelArrayNotify = 19542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyOptionSelectRequest = 19544u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlacementInfoChangeNotify = 19545u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseCurChallengeInfoRequest = 19548u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookCreatePresetRequest = 19553u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DressPlayerTitleUpdateNotify = 19561u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleOperateSelfBgmRequest = 19564u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UiGamePlayResponse = 19566u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityResultRewardRequest = 19569u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatClearNotify = 19574u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushSettlementRequest = 19575u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseMonsterConsecutiveKillsNotify = 19577u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightLastSaveDataResponse = 19578u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommonTouchUiSettingUpdateResponse = 19580u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateFightRoleResponse = 19583u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingBoatDieNotify = 19589u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SummonRandomRequest = 19590u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemRelateFoundationNotify = 19604u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrArchiveReadResponse = 19607u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InspirationUnlockChoiceRequest = 19608u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerGuideActivityInfoRequest = 19610u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolStopResponse = 19611u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemSetPosSenderResponse = 19612u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkInfoResponse = 19613u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseTechUnlockResponse = 19615u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AreaTerminalInfoNotify = 19616u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddMarkInfoNotify = 19623u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreProgressRequest = 19630u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalTaskRewardResponse = 19632u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleFinishRequest = 19634u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffEffectExecuteRequest = 19635u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestBranchRequest = 19642u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrManualSwitchTraceRoadResponse = 19643u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldLevelDiffRequest = 19651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SummonEntityNotify = 19653u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressActivityTrialRoleUpdateNotify = 19657u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchCloseTaskResponse = 19666u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2TreeUpdateNotify = 19674u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PressGameRequest = 19675u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulRoguelikeWriteCatRewardResponse = 19677u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddChapterResultResponse = 19681u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdventureManualResponse = 19686u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallTeleportToMarkIdResponse = 19697u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScheduleNpcUpdatePosResponse = 19698u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoLimitTaskReceiveRequest = 19700u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustHandInRequest = 19706u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GravityFlipInteractResponse = 19707u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulMapTravelSoarRewardRequest = 19711u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillActionResponse = 19712u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailBindInfoRequest = 19713u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookLevelUpResponse = 19714u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CoopSpRewardResponse = 19720u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemExchangeInfoResponse = 19721u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSceneGroupDataResponse = 19725u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueBossLinkSettleNotify = 19729u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPosResetNotify = 19731u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityActiveResponse = 19734u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaUsePoolResponse = 19735u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleLeaveSlotRequest = 19738u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationUpdateNotify = 19741u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillAddPush = 19744u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionResetPosPrePerformanceEndRequest = 19745u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerSaveRecordRequest = 19751u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddDecalResponse = 19752u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementInfoResponse = 19753u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFlyEquipChangeNotify = 19754u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ValidTimeItemAddNotify = 19758u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryBagOperateRequest = 19759u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorUseSkinRequest = 19760u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRoleSelectUpdateNotify = 19763u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceCreateResponse = 19764u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryPickUpItemResponse = 19769u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulAchievementReceiveResponse = 19770u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetMatchTeamMatchFlagResponse = 19772u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ANStartPush = 19776u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReadCardResponse = 19779u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PolluteGridCellResponse = 19787u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderApplyBuffNotify = 19792u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsBulletScreenResponse = 19809u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchTeamStateNotify = 19812u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSkillNotify = 19813u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MontagePlayResponse = 19825u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ElevatorMoveNotify = 19828u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenTaskRewardRequest = 19830u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedUnlockRequest = 19831u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDealCardReplaceRequest = 19834u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonTargetRewardRequest = 19837u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlowTimePush = 19838u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRoleUpdateNotify = 19840u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisInfoResponse = 19842u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpecialItemUnEquipRequest = 19843u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NormalItemRemoveNotify = 19848u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushFailResultNotify = 19850u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryInstLeaveRequest = 19853u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolOneKeyGalleryRewardResponse = 19859u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveReviveRegionResponse = 19862u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingSettleRequest = 19863u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingBuffUpdateNotify = 19869u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerTimerDurationUpdateNotify = 19870u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingInfoUpdateNotify = 19875u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleLogNotify = 19877u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueInstExtraInfoResponse = 19878u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JSPatchNotify = 19879u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonTokenCoinNotify = 19882u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialResultRequest = 19883u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerRankRequest = 19891u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsWeaponInfoRequest = 19901u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapUnlockFieldInfoResponse = 19902u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardSkillRequest = 19909u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassLevelUpResponse = 19912u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SkillNotify = 19915u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterViewDirectionPush = 19916u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TopPhantomEquipGroupRequest = 19922u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerStartRequest = 19933u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponItemRemoveNotify = 19935u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryTalentInfoUpdateNotify = 19936u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleGoDownNotify = 19940u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamParkourRewardRequest = 19943u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopLockResponse = 19957u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchThreeStarRequest = 19959u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PullingFoundationRequest = 19966u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyBuffFailedNotify = 19969u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryDiscardItemRequest = 19973u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookMotorRewardRequest = 19974u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PsnSettingUpdateResponse = 19977u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsLockRequest = 19978u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NpcTraceFailedResponse = 19981u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleStateChangeRequest = 19982u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingQuickSellRequest = 19986u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddPlacementNotify = 19989u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapOpenPush = 19992u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlTaskRewardRequest = 19998u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerNetStateBackServerPush = 19999u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConfirmCompleteRefMp4QuestNotify = 20002u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockMovementFinishResponse = 20004u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SkinRewardResponse = 20013u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballFriendRankResponse = 20019u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerSeasonRewardResponse = 20020u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldEnterPermissionsRequest = 20021u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneModeChangeFinishResponse = 20026u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledShowRequest = 20029u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityCommonTagNotify = 20031u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OnlineMotorStartNotify = 20033u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeSeasonRewardReceiveRequest = 20035u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiHateResponse = 20048u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThemePersonalScoreRequest = 20050u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChannelChatResponse = 20052u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffEffectResponse = 20053u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookInfoUpdateNotify = 20058u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlaySelectCardGroupRequest = 20063u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedUnlockResponse = 20078u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkCoastInfoResponse = 20081u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InputSettingResponse = 20083u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DissolveCombineRelationResponse = 20084u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantStableValueActivityRequest = 20090u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueArchiveSaveRequest = 20091u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonTargetUpdateNotify = 20094u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSkinAddNotify = 20095u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessUpdateNotify = 20096u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerScoreRewardResponse = 20097u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessRewardResponse = 20099u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExecuteQteResponse = 20100u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TurntableCompleteRequest = 20102u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    Summon2Response = 20104u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoveSceneItemResetPositionResponse = 20105u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MutiplayerTeamRefreshNearListResponse = 20108u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerFunctionPreUnlockResponse = 20110u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangePlayerUiStateResponse = 20111u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponSkinUpdateNotify = 20115u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardRoleTargetInfoResponse = 20116u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchThreeEndResponse = 20119u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoScoreTaskReceiveResponse = 20122u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemStopResponse = 20130u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueChooseDataResultResponse = 20137u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationResponse = 20142u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseRewardUpdateNotify = 20145u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrManualSwitchTraceRoadRequest = 20148u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterAoiNotify = 20155u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayRewardRequest = 20160u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelSequenceFrameEventActionResponse = 20164u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetDebugInfoNotify = 20169u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoteBatchCollectResponse = 20188u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaAccumulateRewardResponse = 20196u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrRoadBuildRequest = 20207u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderRemoveBuffByTagsRequest = 20210u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassPortalRequest = 20215u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonRoleDataRequest = 20217u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TurntableTaskUpdateNotify = 20220u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdatePlayerPassiveSkillRequest = 20221u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailReadRequest = 20227u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreEntityTraceRequest = 20228u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementCountChangeNotify = 20230u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsOpDataForceChangeNotify = 20232u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerTaskDataUpdateNotify = 20235u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestBranchResponse = 20238u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeResultRequest = 20242u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateWorldTeamPlayerFightInfoNotify = 20243u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtSetTimerInfoResponse = 20250u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleFourCTaskDealCardNotify = 20251u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DestroyQuestsNotify = 20252u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerTitleInfoUpdateNotify = 20253u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlTaskRewardResponse = 20255u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MultiMapInfoNotify = 20261u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeconstructTrapResponse = 20270u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveInstResponse = 20271u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OnlineMotorUpdateNotify = 20286u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleRemovePassengerResponse = 20287u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBadgeRewardInfoUpdateNotify = 20290u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAddNotify = 20302u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseRefreshGainingGroupResponse = 20307u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelSequenceFrameEventActionRequest = 20312u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignSkinRewardRequest = 20317u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleChangeUnlockNotify = 20322u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomReturnResponse = 20325u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EndLessHistoryRequest = 20333u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderRemoveBuffByTagsResponse = 20335u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatHistoryRequest = 20338u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SquadPropChangedNotify = 20340u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetFormationDataRequest = 20343u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InputSettingUpdateRequest = 20344u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InspirationUpdateNotify = 20356u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeconstructTrapRequest = 20360u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialGiveUpTempArchiveRequest = 20363u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PreheatSignSurveyInfoResponse = 20369u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReadDisplayInfoResponse = 20372u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerUnlockTokenUpdateNotify = 20373u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialResultNotify = 20375u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsOpDataUpdateNotify = 20390u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSlotUpdateResponse = 20401u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LastBigSceneMiniMapInfoResponse = 20403u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleEvolveResponse = 20416u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuildingResetResponse = 20421u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchingNotify = 20424u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WuWuTaskRewardResponse = 20425u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballRoleLevelUpRequest = 20427u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRoleInfoUpdateNotify = 20429u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssPluginSynthesisResponse = 20432u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceInfoUpdateNotify = 20433u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrThemeActivityTaskDataUpdateNotify = 20438u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinAddNotify = 20442u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TestCmdNotify = 20443u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeGotoNextRoomRequest = 20444u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QueryRecallItemBagRequest = 20446u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplySceneClientEntityIncIdResponse = 20448u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackSwordChallengeInfoResponse = 20453u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenMotorRewardResponse = 20454u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTraceInfoResponse = 20456u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PreheatSignRewardRequest = 20458u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecGetReportData2FlowResponse = 20463u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopComposeRequest = 20473u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrThemeActivityAwardRequest = 20474u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeDataLayerFinishResponse = 20475u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TargetGearHitRequest = 20478u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackCoastThemeTaskRewardResponse = 20483u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaResultNotify = 20485u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldResultRequest = 20486u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetTraceQuestYuXueModeResponse = 20487u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GaSwitchCommonEnemyProCampResponse = 20488u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2TaskDataUpdateNotify = 20489u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoteBatchCollectRequest = 20492u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendAllResponse = 20502u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayUnlimitedModeResponse = 20504u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerAccessRangeRequest = 20505u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoadingLevelAreaResponse = 20507u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    H5CircumFluenceActivityReadRequest = 20511u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassEnterPush = 20512u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2InfoRequest = 20516u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanUpdatePlanResponse = 20521u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashExpAddNotify = 20523u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeStateRequest = 20524u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthDayInfoNotify = 20525u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityStaticHookMovePush = 20537u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorcycleTaskUpdateNotify = 20545u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OutputDebugInfoRequest = 20551u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchCloseTaskRequest = 20552u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulCorniceMeetingRewardRequest = 20556u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikePopularEntriesChangeResponse = 20560u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldResultNotify = 20566u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoMemoryUpdateNotify = 20573u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DebugDrawPosNotify = 20580u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DissolveCombineRelationRequest = 20585u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeRewardResponse = 20586u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateFormationNotify = 20593u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JoinSceneNotify = 20597u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddTemporaryTeleportResponse = 20601u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LowMemoryChangeSceneFinishRequest = 20606u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonRoleDataResponse = 20611u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorPositionStateNotify = 20614u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakNotify = 20617u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DrownEndTeleportResponse = 20620u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerRecallInfoNotify = 20622u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseQuickEquipResponse = 20626u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkRoleInviteRequest = 20628u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayNextDayRequest = 20630u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyResultResponse = 20631u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailInfosNotify = 20632u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThirdPartyShareResponse = 20634u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkCoastInfoRequest = 20643u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsVarRecordNotify = 20648u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoReChallengeRequest = 20651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DiscardWeaponPush = 20653u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HitNotify = 20656u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBvBLoadingFinishRequest = 20661u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerTimerDataUpdateNotify = 20667u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StorageInfoRequest = 20672u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceInstanceRewardResponse = 20681u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SingleInstRechallengeRequest = 20682u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSelectTargetRequest = 20698u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTechTreeUnlockNotify = 20699u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeSceneModeNotify = 20701u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueResultResponse = 20710u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDecalUpdateNotify = 20711u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportV2GachaRoleUpdateNotify = 20716u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBadgeInfoUpdateNotify = 20719u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemBlackboardNotify = 20724u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangeReadyResponse = 20725u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HandInMingSuRequest = 20726u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTraceInfoRequest = 20733u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoveSceneItemPush = 20741u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WellStreamingFinisRequest = 20746u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoUpgradeRewardSelectRequest = 20748u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterDrownRequest = 20753u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemDisuseRequest = 20767u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GivebackRewardResponse = 20769u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BrochureRewardRequest = 20771u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveHackingEntityNotify = 20772u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationGameplayTagRequest = 20782u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeTempRoleLevelNotify = 20785u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeQuitRequest = 20789u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryActivityInfoRequest = 20790u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdatePlayerAllFightRoleNotify = 20791u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AutoQuestNotify = 20792u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FixToolResponse = 20809u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryDiscardItemResponse = 20810u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeUpdateNotify = 20812u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLimitTaskRewardResponse = 20813u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailFavoriteRequest = 20816u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoadCalabashSkinInfoRequest = 20817u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PilotThrowOperationRequest = 20827u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyTaskRewardResponse = 20830u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BoneVisibleChangePush = 20838u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetRewardTreasureBoxRequest = 20848u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakFinishRequest = 20851u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayCueRequest = 20852u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemSequenceFrameStartRequest = 20858u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRefreshGainRequest = 20860u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResCurrencyUpdateNotify = 20861u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponAddNotify = 20872u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleEvolveRequest = 20873u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpecialItemNotify = 20874u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehiclePassengerUpdateNotify = 20875u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSailingResponse = 20883u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulExploreScoreRewardRequest = 20889u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassExpUpdateNotify = 20892u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoLevelRecordDeleteRequest = 20893u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstEntityTeleportRequest = 20901u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoFightTaskRewardResponse = 20913u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InputSettingUpdateResponse = 20916u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignPhotoRewardResponse = 20917u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalScoreRewardResponse = 20918u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiInformationResponse = 20922u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceSetResponse = 20925u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballInGameStateChangeNotify = 20926u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsComboParamUpdateNotify = 20928u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoLimitTaskReceiveResponse = 20933u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerScoreRewardReceiveRequest = 20934u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderRemoveBuffNotify = 20935u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseAuxiliaryLevelUpRequest = 20936u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowTeleportToPlotPosRequest = 20939u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsTaskRewardResponse = 20940u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoItemUnlockNotify = 20943u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingNetCabinUpdateNotify = 20945u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalDieRequest = 20952u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetDetectionTargetRequest = 20959u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopInstPush = 20960u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollSmallMapInfoRequest = 20965u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SheriffZoneInfoRequest = 20973u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillRemoveRequest = 20977u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveQuestRecallNotify = 20978u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerEnterPollutionResponse = 20980u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorExpAddNotify = 20982u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ValidTimeItemRemoveNotify = 20989u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DiscardWeaponResponse = 20992u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WuWuTaskRewardRequest = 20996u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendApplyHandleResponse = 20998u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorUnLockResponse = 21000u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyBlackFlowerRequest = 21004u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeEndNotify = 21009u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopItemUpdateRequest = 21015u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResInstStartRequest = 21018u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchPolishResponse = 21024u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeGiveUpGainResponse = 21026u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbFormationAutoAddRoleNotify = 21027u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveInstRequest = 21028u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTakeAllRewardRequest = 21032u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleGuideRewardResponse = 21038u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSettingBatchUpdateRequest = 21039u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssLittleRoleLevelUpRequest = 21041u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSkillResponse = 21045u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerResponse = 21047u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmStateBehaviorResponse = 21048u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemUseResponse = 21049u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SelectDetectionTargetRequest = 21057u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheckPublicResourceVersionResponse = 21060u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstSaveDataNotify = 21061u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelFullRewardRequest = 21062u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveActivityScoreRequest = 21065u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymReadResponse = 21070u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeOpenNotify = 21077u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopPush = 21080u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseDevelopResetRequest = 21084u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaAccumulateRewardRequest = 21085u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerPsnInfoGetResponse = 21086u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrThemeActivityAwardResponse = 21087u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResetLocationForZRangeNotify = 21097u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FollowTrackResponse = 21101u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseTechUnlockRequest = 21102u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueRefreshGainResponse = 21110u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangeRoleResponse = 21111u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFlyEquipNotify = 21114u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QingXiaoTaskRewardResponse = 21118u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionOpenSystemBoardNotify = 21125u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopInfoRequest = 21126u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfluenceRewardResponse = 21130u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceEndNotify = 21135u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthdayInitRequest = 21136u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ZitherPlayStateRequest = 21137u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttributeInitNotify = 21138u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorParkourLevelRewardResponse = 21142u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomPutOnResponse = 21144u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageChatThemeChangeResponse = 21146u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeUnlockResponse = 21147u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MovePlacementNotify = 21148u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmBlackboardNotify = 21151u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceEntityPosRequest = 21153u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvignonTaskNotify = 21154u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeforeHitPush = 21161u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlStartFightNotify = 21162u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayTributeRequest = 21163u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UDPMovePackageNotify = 21168u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleLevelUpViewRequest = 21169u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoResTaskReceiveResponse = 21172u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardOutLookUpRequest = 21176u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailBindInfoNotify = 21177u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestFinishActionEndRequest = 21179u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddReviveRegionRequest = 21181u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityRemoveBubbleNotify = 21182u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomCollectReceiveResponse = 21188u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestReadyForGiveUpResponse = 21194u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklySubLevelNotify = 21204u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FoodProcessRequest = 21214u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowServerSkipNotify = 21217u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolSetFlowRequest = 21219u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockCloseGamePlayNotify = 21222u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomVicePolishRequest = 21223u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PullingFoundationResponse = 21229u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FuncShowResponse = 21232u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityCameraAlertResponse = 21236u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReceiveRechallengeResponse = 21241u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DrownEndTeleportRequest = 21245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillRemoveNotify = 21248u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeSceneRoadNotify = 21251u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomRecommendRequest = 21254u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayVarResponse = 21256u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LifePointChallengeUpdateNotify = 21262u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaPoolDetailRequest = 21264u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomReturnPreviewResponse = 21268u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionErrorCodeNotify = 21270u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailAddNotify = 21273u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisLevelRewardResponse = 21274u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRankListRequest = 21276u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitNodeResponse = 21283u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetDetectionLabelInfoResponse = 21286u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamChallengeResponse = 21288u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlFightActionNotify = 21289u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CircumFluenceTaskRewardResponse = 21293u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderApplyBuffRequest = 21297u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LstBattleRecordResponse = 21300u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonIllustratedRequest = 21304u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayCueNotify = 21307u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponResonUpResponse = 21310u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecRoleFightFlowRequest = 21319u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueShopRefreshRequest = 21321u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerFunctionPreUnlockRequest = 21322u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HandInItemRequest = 21324u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageReceivedResponse = 21328u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DrownResponse = 21329u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrInfoRequest = 21330u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NpcPhantomBattleFightInfoNotify = 21331u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveTreasureBoxSlotRequest = 21336u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupUpdateRequest = 21338u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayCuePush = 21343u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSpecialRewardUpdateNotify = 21344u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookLevelUpRequest = 21349u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomInteractionEquipRequest = 21354u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntitySendEventResponse = 21355u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecWorldInfoFlowResponse = 21356u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayGiftInfoRequest = 21361u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommonTouchUiSettingUpdateRequest = 21364u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoonPhaseRewardRequest = 21365u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockExitGamePlayResponse = 21367u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideFinishResponse = 21373u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleEnterSlotRequest = 21374u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingCompleteRequest = 21375u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballQuitResponse = 21377u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EquipTakeOnRequest = 21385u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FurnitureDiySaveRequest = 21389u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuildingLevelUpResponse = 21393u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SkinRewardRequest = 21395u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PolluteGridCellRequest = 21401u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockPointInfoNotify = 21402u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerCreatePsnSessionRequest = 21404u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseGainingGroupUpdateNotify = 21410u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehiclePlatformGetOnRequest = 21411u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EncircleChallengeUpdateNotify = 21412u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QueryOnlinePlayersAreaResponse = 21413u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityTaskInfoNotify = 21420u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoUpgradeRewardRefreshResponse = 21421u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestArtifactNotify = 21422u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulGetAdventureRewardRequest = 21424u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaAccumulateInfoNotify = 21430u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BatchMaterialReplaceResponse = 21431u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayEventChoiceResponse = 21433u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityLoadCompleteNotify = 21435u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoraleInfoNotify = 21439u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityLevelInfoNotify = 21440u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomInteractionSkinChangeRequest = 21448u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScheduleNpcUpdatePosRequest = 21451u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsSpawnMonsterWaveEndNotify = 21452u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkRoleRewardResponse = 21453u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryAreaSecretRewardResponse = 21464u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvoidBlockRoundInfoNotify = 21465u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldLevelPlayRepeatedRequest = 21472u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveMatchTeamNotify = 21476u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResetSpecialBonusNotify = 21478u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeRequest = 21481u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityOnLandedRequest = 21482u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfluenceInfoResponse = 21485u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateNodeProgressNotify = 21488u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangeRoleRequest = 21491u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingActivityMilestoneRewardResponse = 21498u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomAutoPutResponse = 21508u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingTeleportToBoatResponse = 21519u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressTrialRoleUnlockNotify = 21529u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleChangePassengerResponse = 21531u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneGamePlayInfoNotify = 21532u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerSeasonUpdateResponse = 21534u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatSendPackResponse = 21536u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsPlayerInfoResponse = 21541u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueGotoNextRoomCommitRequest = 21542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightEnterSubLevelResponse = 21543u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSelectTargetEffectNotify = 21545u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOnlineRankSnapshotNotify = 21549u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterPatrolPointReachedResponse = 21552u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneGamePlayFirstNotify = 21553u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeamCastHitPlayerResponse = 21555u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AceAntiDataPush = 21559u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddEntityAoiNotify = 21567u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreatureDetailRequest = 21574u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommitBoardSuccessNotify = 21576u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityBuffInfoNotify = 21577u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerLeaveWorldTeamNotify = 21585u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryEquipRoleRequest = 21590u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KickMatchTeamPlayerResponse = 21595u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BathChangeCameraResponse = 21598u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightTalentTreeUpdateNotify = 21599u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResRoleBondUpdateNotify = 21609u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingRewardRequest = 21613u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoMemoryCollectNotify = 21614u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlTaskUpdateNotify = 21615u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSailingRequest = 21616u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerEnterWorldTeamNotify = 21617u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBvBSettleNotify = 21619u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AcceptEntrustResponse = 21620u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaAccumulateInfoResponse = 21629u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillPullGiantResponse = 21630u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryPollutionUpdateNotify = 21640u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBuffTriggerInfoNotify = 21641u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ArtemisNodeUpdateNotify = 21651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleMasterInfoNotify = 21654u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveTemporaryTeleportNotify = 21656u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledDestroyResponse = 21659u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerInfoRequest = 21662u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeTakeResponse = 21667u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FinishDownloadQuestResourceRequest = 21668u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeBossInstStartResponse = 21669u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmSetRedDotResponse = 21670u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropCatchInfoRequest = 21673u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatResponse = 21677u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyBlackFlowerResponse = 21684u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemAiDisableNotify = 21693u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BoneVisibleChangeResponse = 21695u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillRemovePush = 21698u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAccessCasketResponse = 21699u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceUpdateNotify = 21702u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceCreateRequest = 21703u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorSummonAndRideNotify = 21704u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TetrisUpdateResponse = 21709u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustTraceRequest = 21717u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLockItemResponse = 21718u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HostFogIdUnlockNotify = 21721u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifyEntityCampNotify = 21724u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerApplyFloorDataRequest = 21733u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResonantChainUnlockResponse = 21735u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HandInItemResponse = 21737u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoEndSpecialWaveCombatResponse = 21746u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewJourneyRequest = 21748u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerChallengeUpdateNotify = 21751u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RobotDestinationNotify = 21753u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTalentSkillLevelRequest = 21757u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitNodeRequest = 21759u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2TreeFinishCondUpdateNotify = 21763u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsBulletScreenRequest = 21780u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssLikeResponse = 21792u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TransformBuffStackNotify = 21805u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyQuestGetRewardResponse = 21806u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScenePlayerOfflineNotify = 21816u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeEntityStateResponse = 21818u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimePointRewardActivityConditionNotify = 21826u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayInfoResponse = 21829u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmConditionPassRequest = 21831u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlyEquipAddNotify = 21836u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBvBLoadingNotify = 21837u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FragileChangeResponse = 21843u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AreaTerminalPinOperationRequest = 21848u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ForgeItemRequest = 21849u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TutorialUnlockRequest = 21852u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimelineTraceStartResponse = 21855u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AccessPasserbyNpcSpawnerRequest = 21857u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneSubLevelsNotify = 21860u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateEnableFunctionNotify = 21861u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherNotify = 21865u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewLinkNotify = 21875u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FeiXuePreheatInfoUpdateNotify = 21876u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRewardsUpdateNotify = 21881u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingShipSkinChangeResponse = 21884u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestNpcMoveOverResponse = 21885u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayGiftResponse = 21886u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonBuildFlowRequest = 21892u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsRankResponse = 21901u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchSceneGroupNotify = 21909u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffItemResponse = 21929u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingShipFixResponse = 21934u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolSaveResponse = 21936u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstSettleNotify = 21939u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkRoleRewardRequest = 21940u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolAddTagResponse = 21942u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveSceneNotify = 21944u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CharacterDeathRequest = 21948u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateMessageNotify = 21956u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueShopRefreshResponse = 21963u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressQuestionOpenRequest = 21964u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeadeyeShootHitResponse = 21965u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AgreeJoinResultNotify = 21974u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleRequest = 21983u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MiniWriteLetterLoginNotify = 21985u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoStepUpdateNotify = 21986u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LineCrossChallengeStartResponse = 21987u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BasicInfoNotify = 21993u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomInteractionEquipResponse = 21997u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmMainLineInfoResponse = 21999u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RunTestResponse = 22000u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestStarRewardRequest = 22005u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResGotoNextRoomRequest = 22010u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillViewRequest = 22013u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TotalTopUpRewardResponse = 22019u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StorageInfoUpdateRequest = 22023u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityResultNotify = 22031u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryMascotInfoUpdateNotify = 22035u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTrialSettleNotify = 22045u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssLikeNotify = 22047u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeStartRequest = 22052u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MobileButtonSettingUpdateResponse = 22058u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymReadRequest = 22064u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleGamerStatusInfoNotify = 22067u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateChildQuestNodeStatusNotify = 22070u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockCardNotify = 22072u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillRemoveResponse = 22073u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleStateChangeResponse = 22078u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailDeleteResponse = 22089u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EffectiveWeekCardInfoNotify = 22090u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattlePhantomCardSkillResponse = 22092u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemRewardNotify = 22096u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceRecallQuestNotify = 22097u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResSwitchFormationResponse = 22098u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRankListResponse = 22100u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveTemporaryTeleportRequest = 22106u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneSubLevelsChangedNotify = 22107u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StartRecallResponse = 22108u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackSwordChallengeInfoRequest = 22114u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementUpdateResponse = 22115u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballInGameStarChangeNotify = 22124u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiInformationPush = 22125u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FightDataCheckNotify = 22139u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchLogicStateResponse = 22141u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCheckCardSkillUnlockResponse = 22143u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityLevelNotify = 22145u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSelectReserveCardRequest = 22146u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueLootChangeRequest = 22152u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookCreatePresetResponse = 22153u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PartUpdateRequest = 22158u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallMapMarkInfoNotify = 22163u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchSettleDataResponse = 22164u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRoundOverRequest = 22166u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressQuestionOpenResponse = 22169u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleBreakThroughViewRequest = 22171u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrRoadBuildResponse = 22175u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyTaskUpdateNotify = 22180u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveTaskInfoNotify = 22181u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OtherJoinSceneNotify = 22182u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterDrownResponse = 22186u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolOneKeyRewardRequest = 22187u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingPointInfoRequest = 22194u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymGroupInfoUpdateNotify = 22195u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyTaskRemoveNotify = 22199u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleChangePassengerRequest = 22200u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LifePointChallengeStartResponse = 22206u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayEventChoiceRequest = 22212u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SunSpiritActionOperationEndPush = 22214u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustRefreshRequest = 22223u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueLootChangeNotify = 22228u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonthCardRequest = 22235u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockSwitchControlBlockResponse = 22237u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveInstanceTimerResponse = 22241u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NormalMonsterManualInfoRequest = 22245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthDayCardRoleResponse = 22249u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateInitPush = 22251u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaInfoResponse = 22256u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CoopSpRewardRequest = 22261u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    H5ViewActivityReadRequest = 22263u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBackLibraryRequest = 22264u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerSettlementResponse = 22271u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetClientGlobalVarRequest = 22272u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportTrialRoleLvUpResponse = 22280u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropCatchLevelRewardUpdateNotify = 22284u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseRewardGainingGroupsNotify = 22298u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OutputDebugInfoResponse = 22307u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ControlInfoNotify = 22309u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsPlayerInfoRequest = 22312u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementInfoRequest = 22315u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightItemUpdateNotify = 22316u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorSliderRequest = 22317u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationSwitchCurrentResponse = 22323u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLimitTaskInfoUpdateNotify = 22327u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GravityHookLockPointChangeGravityResponse = 22328u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSceneGroupDataNotify = 22332u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAddBubbleNotify = 22334u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ElevatorStateChangeRequest = 22336u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssLittleRoleLevelUpResponse = 22337u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetMatchTeamMatchFlagRequest = 22339u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTaskUpdateNotify = 22342u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinWearRequest = 22343u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonBuildFlowResponse = 22345u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetDetectionLabelInfoRequest = 22348u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyGridRewardRequest = 22355u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoPropertyUpdateNotify = 22357u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerRoleVoiceSetResponse = 22358u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddTemporaryTeleportInfoNotify = 22362u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTrainResponse = 22364u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardTargetInfoRequest = 22368u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeWriteCatLevelPlayRewardResponse = 22369u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuickHackRamVerifyPush = 22375u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeBoxExpNotify = 22380u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerFloorSettleNotify = 22389u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulMapTravelTaskRewardRequest = 22390u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerRoleVoiceSetRequest = 22391u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorLinkTaskResponse = 22394u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthDayRewardResponse = 22398u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSkinChangeRequest = 22400u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinUnLoadRequest = 22401u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffEffectRequest = 22402u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyBlackFlowerNotify = 22410u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemMoveTargetNotify = 22412u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerHeadResponse = 22413u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchAcceptInviteRequest = 22419u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballInGameKickBallRequest = 22423u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolTaskProgressRewardRequest = 22424u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightPlayerDeadRequest = 22425u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FallFinishNotify = 22427u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntitySendEventRequest = 22433u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerVoiceLanguageRequest = 22437u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDecalTaskResponse = 22439u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiHatePush = 22440u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdatePhantomEquipGroupRequest = 22464u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlockListRequest = 22469u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallInstSaveDataNotify = 22471u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolAddTagRequest = 22474u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAccessRangeRequest = 22475u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRefreshSubLevelNotify = 22478u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuildingLevelUpRequest = 22480u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleIllustratedInfoResponse = 22483u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExchangeRewardInfoNotify = 22486u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorUseSkinResponse = 22488u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemovePlacementFromBoardNotify = 22490u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerReviveNotify = 22493u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneSubLevelsResponse = 22498u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeeklyFrameworkInfoResponse = 22499u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSoundBoxSkillResponse = 22512u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchSettleRequest = 22514u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResInstResultRequest = 22518u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponItemAddNotify = 22519u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestGiveUpNotify = 22535u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayItemResponse = 22536u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReportPlayerResponse = 22547u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulCorniceMeetingRewardResponse = 22551u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailBindRequest = 22555u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSkillFailResponse = 22556u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiBlackboardsRequest = 22558u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaughtResponse = 22560u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleMasterLevelRewardResponse = 22561u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLifeSupportNotify = 22572u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballWeaponWearRequest = 22578u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeleteStoryCharacterRequest = 22583u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetQuestFocusModeResponse = 22593u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InteractQuestSuspendEntityNotify = 22595u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationRequest = 22596u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GatherActivityRewardRequest = 22600u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlaceItemOnBoardResponse = 22601u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockResetGamePlayRequest = 22610u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtRangeFailWarningNotify = 22612u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QingXiaoTaskUpdateNotify = 22617u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestActionResponse = 22619u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetPlayerYuXueModeResponse = 22623u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AccessPathConfigResponse = 22626u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeMonsterRoleNotify = 22631u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BrochureRewardResponse = 22634u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorListRequest = 22639u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JoinSceneNotifyConfirmRequest = 22643u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassRequest = 22649u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchAnimationResponse = 22651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRefreshCollectionRequest = 22653u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrialRoleRewardRequest = 22659u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeStateConfirmResponse = 22660u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationSwitchRoleRequest = 22661u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldLevelPlayRequest = 22663u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VacuumCleanerResponse = 22664u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingInfoResponse = 22673u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PressGameNotify = 22674u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommitBoardRequest = 22677u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MingSuHandRewardResponse = 22679u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitItemInfoNotify = 22681u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGarbStartResponse = 22696u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherControlUnlockNotify = 22697u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballFixSpawnFinishNotify = 22699u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShowInvalidItemRequest = 22706u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowerPollutionRequest = 22707u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NormalMonsterManualInfoResponse = 22708u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendRecentlyTeamRequest = 22709u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportVehicleNotify = 22711u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabStopResponse = 22720u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LongShanStageUpdateNotify = 22723u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemLockResponse = 22732u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterAreaRequest = 22737u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LanguageSettingUpdateRequest = 22740u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRankListRequest = 22743u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceSettingNotify = 22745u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessCountUpdateNotify = 22746u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VacuumCleanerRequest = 22748u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideFinishRequest = 22758u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoMemoryResponse = 22761u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapUnlockFieldNotify = 22762u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NormalItemResponse = 22771u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyArtifactSelectRequest = 22776u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashSkinTakeOnNotify = 22784u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTrialSceneRollbackPush = 22790u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtGiveUpResponse = 22791u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlItemUnlockNotify = 22794u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdatePlayerPassiveSkillResponse = 22796u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoWeaponUpdateNotify = 22797u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTaskInfoNotify = 22808u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetFanNumberOfTurnsRequest = 22814u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingItemAddNotify = 22817u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FragileChangeRequest = 22818u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayInstShareFirstInfoNotify = 22822u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveTotalScoreNotify = 22825u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResetBabelTowerLevelRequest = 22844u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityResultRequest = 22854u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportSetCurUseTrialRoleRequest = 22855u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    H5CircumFluenceActivityReadResponse = 22858u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestChangeTraceNotify = 22862u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockItemUpdateNotify = 22864u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HardnessModeChangedNotify = 22866u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BanItemUseNotify = 22869u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialSelectBossRequest = 22870u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoopTeleportVolumeActionRequest = 22884u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageUpdateRequest = 22887u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageReplyRequest = 22894u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoChestRewardSelectResponse = 22900u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TutorialInfoResponse = 22904u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerGuideActivityRewardResponse = 22907u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleTaskRewardRequest = 22908u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsGearRefundRequest = 22909u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightSelectBuffGateResponse = 22911u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeWriteCatRewardResponse = 22912u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeGainDataUpdateNotify = 22913u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtRollbackResponse = 22916u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookOwnedChangeNotify = 22922u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReadDisplayInfoRequest = 22933u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorInfoResponse = 22936u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityResultUpdateNotify = 22938u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomVicePolishAckResponse = 22940u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlChallengeUnlockNotify = 22943u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldBlackboardRequest = 22945u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTaskRequest = 22950u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowActionRequest = 22962u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagStrongholdInfoUpdateNotify = 22966u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdventureUpdateNotify = 22975u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MaxMessageIdPush = 22976u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBuffProducerOperateResponse = 22978u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRepeatedTaskRewardRequest = 22983u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBadgeRewardRequest = 22984u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommonOrganResetTimeRequest = 22989u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeStartResponse = 22991u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBeamReceiveRequest = 22992u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleAddBuffInfoNotify = 22993u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsRepeatedTaskRewardResponse = 22994u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeResultNotify = 22995u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConfirmQuestResourceRequest = 23000u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityWalkingPatternFinishResponse = 23002u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmStateBehaviorRequest = 23005u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateNodeStatusNotify = 23007u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetQuestResourceStateRequest = 23014u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryInstLeaveResponse = 23019u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleDevelopConfigResponse = 23021u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchInfoResponse = 23023u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookFormulaResponse = 23024u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSellResponse = 23025u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayGiftConditionFinishNotify = 23030u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AcceptFocusWaitQuestResponse = 23033u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrRoadUpdateNotify = 23036u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemStateRequest = 23046u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewHandInItemRequest = 23060u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetInstExchangeRewardResponse = 23064u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopRefreshRequest = 23068u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBattleInfoResponse = 23069u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerGuideActivityInfoResponse = 23078u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsWeaponInfoResponse = 23080u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageUpdateNotify = 23082u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRefreshBossPush = 23084u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssPluginItemInfoUpdateNotify = 23091u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialStartResponse = 23092u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingActivityLimitRewardResponse = 23099u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetRewardTreasureBoxResponse = 23102u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillBranchModifyResponse = 23107u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StartMatchNotify = 23110u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BathPhotoRequest = 23123u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PackAnimChangedNotify = 23124u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendAddedNotify = 23136u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateFormationRequest = 23144u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RolePhantomPropUpdateNotify = 23146u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchUnlockTechPointRequest = 23148u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TreasureChestCountNotify = 23149u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DecalRemoveNotify = 23152u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushBuffChooseResultRequest = 23159u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerRoundUpdateNotify = 23161u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlaySwitchSportModeRequest = 23163u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerRecommendRequest = 23165u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryInstSettleNotify = 23167u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueShopInfoUpdateNotify = 23170u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballSetPayloadRequest = 23171u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TriggerExitSkillRequest = 23172u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockHeadPhotoNotify = 23177u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessTaskTakeResponse = 23181u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryBagInfoUpdateNotify = 23184u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashLevelRewardResponse = 23187u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GivebackRewardRequest = 23197u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSexChangeResponse = 23208u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueBlessGroupSelectNotify = 23210u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockGamePlayReadyResponse = 23212u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchInfoRequest = 23216u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SysInfoNotify = 23221u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtRollbackRequest = 23225u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResPlayerStatusUpdateNotify = 23230u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomInteractionUnlockNotify = 23244u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefensePreviewStartNotify = 23247u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomCollectUpdateNotify = 23250u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveOccupationInfoNotify = 23251u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRoleAddNotify = 23255u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimelineTraceControlResponse = 23257u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchOutRequest = 23261u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceRequest = 23265u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueCurrencyNotify = 23276u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnOpenedAreaPullbackResponse = 23277u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleShowListUpdateResponse = 23280u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DieSwitchRoleNotify = 23281u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExchangeSharedInfoNotify = 23282u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryAddWeaponNotify = 23284u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTaskUpdateNotify = 23286u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvoidBlockClientInitDoneResponse = 23288u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerRewardTaskUpdateNotify = 23293u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerItemUpdateNotify = 23300u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LinkageRewardResponse = 23303u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLockItemRequest = 23316u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchFailNotify = 23326u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FoodProcessResponse = 23327u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoSyncEntityDealDamagePush = 23335u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntitySimplyMoveInfoPackagePush = 23337u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonConditionNotify = 23338u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolySceneGridInfoNotify = 23339u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayShopBuyRequest = 23342u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchActionResponse = 23348u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BoardGridDynamicConfigChangeNotify = 23350u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayGiftSuccessNotify = 23351u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyQuestChangePreferRequest = 23357u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookMotorRewardResponse = 23361u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDebugInfoRequest = 23362u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledPosInFoundationNotify = 23363u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveSysBuffNotify = 23366u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerBasicInfoGetRequest = 23383u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CharacterDeathPush = 23389u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuickHackSkillRequest = 23390u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VisionSkillCallNotify = 23392u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerGravityUpdateNotify = 23394u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ForgeFormulaUnlockRequest = 23395u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerTitleResponse = 23404u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BanChatNotify = 23415u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicSwitchRequest = 23417u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayInfoRequest = 23421u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressDisposableRewardResponse = 23423u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseStepUpdateNotify = 23425u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopUnlockNotify = 23429u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSceneVoiceSwitchNotify = 23430u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoRefineWeaponResponse = 23434u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleTrackReportResponse = 23444u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterMatchTeamNotify = 23456u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeCardRequest = 23459u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NetTestDataResponse = 23468u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushClaimRewardResponse = 23469u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldLevelRegainResponse = 23479u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeGotoNextRoomResponse = 23489u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OpenSystemBoardResultResponse = 23490u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicUnlockResponse = 23502u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingPortUnlockNotify = 23503u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchSettleDataRequest = 23504u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisFormulaUnlockRequest = 23511u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlockListResponse = 23512u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorLinkTaskRequest = 23517u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballUpdateWaveNotify = 23526u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitPhotoNodeResponse = 23527u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanUpdatePlanRequest = 23537u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerDailyTaskRewardResponse = 23540u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecGetReportData2FlowRequest = 23542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushSelectBuffNotify = 23543u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssPluginPutResponse = 23547u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardUnlockResponse = 23550u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmChangePartnerRoleRequest = 23553u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreToolAllNotify = 23555u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FoundationCoreOperateResponse = 23558u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmChangePartnerRoleResponse = 23561u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerStepAdvanceRequest = 23562u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActorVisibleResponse = 23563u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeSummonEntityStateRequest = 23569u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GmVoxelInfoNotify = 23572u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayOpenRequest = 23577u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelInfoUpdateNotify = 23579u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoraleTreasureBoxTraceResponse = 23584u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldBlackboardNotify = 23585u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerSeasonRewardRequest = 23587u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleMotionActiveNotify = 23591u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientBasicInfoRequest = 23592u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EncircleChallengeCompleteRequest = 23593u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlaceItemOnBoardRequest = 23598u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateInitNotify = 23601u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoEndShopStepResponse = 23609u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InspirationUnlockChoiceResponse = 23610u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestReviewInfoRequest = 23616u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignDrawRewardResponse = 23619u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerRecommendResponse = 23623u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledShowNotify = 23631u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageChatCharmChangeRequest = 23634u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EncircleChallengeCompleteResponse = 23637u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetBtObjYuXueModeRequest = 23639u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UsePhantomEquipGroupRequest = 23641u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScratchCardRewardRequest = 23653u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchStartPlayResponse = 23655u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerResultNotify = 23657u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeWriteCatBossRewardResponse = 23662u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeOrnamentResponse = 23664u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailReadResponse = 23666u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsLastInfoRequest = 23667u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerUpdateNotify = 23668u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerDeadNotify = 23671u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleResponse = 23682u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashMsgRequest = 23687u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeSummonEntityStateResponse = 23698u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsTalentLevelUpResponse = 23700u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayRefreshGachaRequest = 23703u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightPlayerDeadResponse = 23704u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballQuitRequest = 23709u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRefreshGainResponse = 23711u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyAdventureTaskRewardRequest = 23720u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GatewayEchoResponse = 23722u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetBtObjYuXueModeResponse = 23727u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InteractiveUpdateResponse = 23737u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapRemoveAllMarkResponse = 23743u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowRestartResponse = 23746u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetFocusModeDeterCondRequest = 23749u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BathChangeCameraRequest = 23750u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackCoastThemeTaskRewardRequest = 23757u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerClearRecordRequest = 23758u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvoidBlockSettlementNotify = 23761u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisFormulaUnlockResponse = 23763u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceVoteRequest = 23765u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSkillBombRequest = 23767u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFastReturnPosRequest = 23769u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceMoonPhaseRewardRequest = 23777u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityDailyTaskInfoNotify = 23786u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSellPreviewResponse = 23795u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbGetRoleListNotify = 23798u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingCompleteResponse = 23801u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SingleInstRechallengeResponse = 23802u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressBonusResponse = 23806u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerStageSettleRequest = 23809u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorLockedTechUpdateNotify = 23811u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LanguageSettingUpdateResponse = 23816u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityStaticHookMoveRequest = 23825u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangePlayerTitleResponse = 23826u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerRankRewardReceiveRequest = 23829u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDealCardReplaceNotify = 23835u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsCloseSettleMenuResponse = 23836u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardPosChangeNotify = 23839u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterMatchInstRequest = 23840u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityPointNotify = 23843u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResChangeFormationResponse = 23844u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseDetectionSkillResponse = 23849u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballInGameKickBallResponse = 23854u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityInteractRequest = 23858u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InteractiveUpdateRequest = 23869u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderRemoveBuffByTagsNotify = 23871u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowerPollutionResponse = 23879u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConstructTrapResponse = 23882u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookFoodResponse = 23883u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddTreasureBoxSlotRequest = 23884u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryTotalRevenueNotify = 23885u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FoundationRequest = 23886u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PartUpdateResponse = 23891u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityPayShopBuyRequest = 23899u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyRewardResponse = 23902u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyGameplayEffectResponse = 23904u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillLevelUpViewResponse = 23907u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookEditPresetResponse = 23910u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingTeleportToBoatRequest = 23911u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAccessRangeNotify = 23916u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemMoveTargetResponse = 23917u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DrownEndTeleportPush = 23918u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantItemAccessUnlockNotify = 23920u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallTeleportToMarkIdRequest = 23922u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DetectionPreOpenNotify = 23923u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsScoreAwardResponse = 23924u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSysBuffNotify = 23927u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PsnSettingResponse = 23928u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBattleInfoRequest = 23936u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeUnlockRequest = 23937u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceInstanceRewardRequest = 23941u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExchangeRewardInfoResponse = 23945u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CorniceChallengeTransRequest = 23951u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerLevelUnlockNotify = 23956u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchUpdatePlayerInfoNotify = 23957u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityLevelResponse = 23959u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailDeleteRequest = 23960u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolReachEndingResponse = 23961u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsStepAdvanceResponse = 23962u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PressGameResponse = 23963u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StartMatchRequest = 23965u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeeklyFrameworkScoreRewardResponse = 23966u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreScoreRewardRequest = 23970u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSystemInfoNotify = 23974u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateChangedResponse = 23977u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCarnivalTaskDataUpdateNotify = 23985u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWhiteCatRecordRequest = 23990u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleIllustratedInfoRequest = 23991u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecFBRoundStartFlowRequest = 23993u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropCatchLevelFinishRequest = 23994u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayRemoveUnitRequest = 24002u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoSettlementResponse = 24003u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FunPlayChallengeAwardResponse = 24010u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InterruptSkillInDelayRequest = 24013u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateEnterInfoNotify = 24015u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardDurableEmptyNotify = 24020u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleScoreEnableNotify = 24023u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSettingRequest = 24025u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseChallengeQuitRequest = 24031u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailBindRewardRequest = 24034u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerRoleEnergyRequest = 24038u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RenjuResetResponse = 24055u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryInstTopTowerSettleNotify = 24069u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerSeasonUpdateRequest = 24072u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponItemResponse = 24074u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessTakeRequest = 24082u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisItemRequest = 24085u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoSellWeaponResponse = 24086u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTalentLevelUpResponse = 24087u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitPhotoNodeRequest = 24093u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookAddNotify = 24099u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerRankRewardReceiveResponse = 24106u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockUpdateGamePlayNotify = 24110u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExecuteQteNotify = 24112u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoChestRewardNotify = 24115u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangeRoleNotify = 24116u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopSellResponse = 24125u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemMoveTargetRequest = 24132u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlScoreRewardResponse = 24133u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SplinePositionUpdateRequest = 24134u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WuWuKujiGachaRequest = 24138u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportTrialRoleLvUpRequest = 24142u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushTaskRewardResponse = 24143u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffStackCountRequest = 24150u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialReChallengeRequest = 24158u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceSetRequest = 24164u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConfirmQuestResourceResponse = 24175u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymInfoRequest = 24178u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WuWuTaskUpdateNotify = 24180u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightTalentUpResponse = 24183u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestShowListNotify = 24184u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalAtmosphereRewardRequest = 24192u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScratchCardActivityInfoResponse = 24195u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmRankListSelfDataResponse = 24201u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockSplitPopWindowNotify = 24204u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueBlackFlowerNotify = 24206u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveTreasureBoxSlotResponse = 24211u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdventureManualDataResponse = 24214u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailBindInfoResponse = 24222u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerTaskRewardRequest = 24223u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayRewardCountResetNotify = 24225u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPosAbnormalResponse = 24226u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemDecomposeResponse = 24230u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAdsorbRequest = 24232u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsResultResponse = 24240u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeStateConfirmPush = 24241u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendRecentlyTeamResponse = 24249u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanSetPlanStatusRequest = 24251u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateChangedNotify = 24252u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchAcceptInviteNotify = 24254u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpecialItemUnEquipResponse = 24255u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoDieNotify = 24258u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewHandInItemResponse = 24260u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyerEnterSceneNotify = 24262u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolStopRequest = 24266u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBadgeRewardResponse = 24270u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonIllustratedResponse = 24278u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowRestartRequest = 24285u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSceneDateResponse = 24289u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeCurrencyUpdateNotify = 24300u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonActivityRewardResponse = 24303u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardRewardRequest = 24305u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageReplyResponse = 24310u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2ManualSwitchTraceTreeRequest = 24316u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneGamePlayStatusNotify = 24317u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreatStoryCharacterResponse = 24319u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookingInfoUpdateNotify = 24324u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTalentUnlockNotify = 24327u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmConditionPassPush = 24334u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushLevelScoreRewardRequest = 24337u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ProgressBarFinishRequest = 24347u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropCatchLevelFinishResponse = 24353u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmMontageDurationNotify = 24356u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopLockRequest = 24357u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsPlayerInfoUpdateNotify = 24358u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetFanStateResponse = 24361u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoUpgradeRewardSelectResponse = 24364u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResChangeFormationRequest = 24365u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerSeasonTaskDataUpdateNotify = 24370u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthDayCardRoleRequest = 24371u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulGetAdventureRewardResponse = 24375u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OccupyRewardResponse = 24387u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTraceResponse = 24396u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterAttributeArrayNotify = 24398u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeTakeRequest = 24399u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StartMatchResponse = 24408u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityDressOrnamentChangeNotify = 24410u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResIllustrationAwardResponse = 24417u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomItemResponse = 24418u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SeamlessTeleportVehicleResponse = 24419u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleMotionUnLockResponse = 24424u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeamCastHitPlayerRequest = 24426u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTalentUnlockNotify = 24427u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsLockResponse = 24428u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldLevelNotify = 24429u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsTalentLevelUpRequest = 24431u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEntitySyncAttributePush = 24434u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyRechallengeRequest = 24437u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoFightTaskRewardRequest = 24443u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseDevelopResetResponse = 24446u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightKillRequest = 24452u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballWeaponDegradeResponse = 24456u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingTechLevelUpResponse = 24459u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BulletPatternNotify = 24460u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemSequenceFrameEndResponse = 24461u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FollowerChairPresentationPush = 24462u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReviveResponse = 24465u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerLordGymLevelPlayResultNotify = 24470u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldEnterPermissionsResponse = 24472u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AwakeDynamicPortalRequest = 24473u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingQuickSellResponse = 24478u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseGetRewardRequest = 24481u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PartUpdateNotify = 24482u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyGotoNextRoomRequest = 24488u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyDiceResponse = 24491u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssReviveNotify = 24492u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulRoguelikeWriteCatRewardRequest = 24493u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateFightRoleRequest = 24496u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsStepUpdateNotify = 24499u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapCustomMarkUpdateNotify = 24503u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueBlackFlowerRequest = 24506u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymInfoResponse = 24508u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DirectTrainPreOpenCloseNotify = 24510u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockPointResponse = 24512u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PsnSettingUpdateRequest = 24513u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnergyUpdateNotify = 24514u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExhibitionItemSaveRequest = 24520u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBackSlotCardLibraryResponse = 24521u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookTaskRewardResponse = 24523u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WillSwitchSceneGroupNotify = 24534u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GmEntityFsmGroupInfoRequest = 24535u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchRewardMilestoneResponse = 24536u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateFormationResponse = 24546u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledResponse = 24551u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FastReturnDungeonResponse = 24553u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballInGameSyncPayloadResponse = 24557u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerNetStatePush = 24558u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChannelChatHistoryNotify = 24562u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEntityDieRequest = 24565u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportFinishResponse = 24577u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldResultResponse = 24579u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookingDataRequest = 24585u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerAccessRangeNotify = 24586u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayEntityMontagePush = 24591u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    Summon2Request = 24593u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChapterResultRewardRequest = 24597u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplySceneClientEntityIncIdRequest = 24599u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportTransferRequest = 24606u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportDataResponse = 24608u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionFinishImmediatelyNotify = 24609u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendApplyHandleRequest = 24610u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballSettleNotify = 24613u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerSeasonScoreRewardResponse = 24617u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityDeTermInfoNotify = 24618u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityRecommendNotify = 24619u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeEntityRoleRequest = 24621u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantMaxLevelDeliveryItemRequest = 24629u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StorageInfoUpdateResponse = 24640u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCallCardNotify = 24644u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemExchangeResponse = 24645u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreLevelNotify = 24649u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTaskUpdateNotify = 24660u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchInviteNotify = 24663u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayStateListResponse = 24664u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeeklyFrameworkInfoUpdateNotify = 24665u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttributeChangedResponse = 24670u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StopMoveSplineResponse = 24675u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffDurationNotify = 24676u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResIllustrationUpdateNotify = 24683u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchRoundActionResponse = 24685u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalDieNotify = 24686u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSelectTargetResponse = 24690u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemovePreloadFlowsNotify = 24692u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlBagUpdateNotify = 24695u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchRewardTaskResponse = 24696u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NormalItemAddNotify = 24714u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddCombineEntitiesRelationNotify = 24720u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AgreeJoinResultResponse = 24721u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemMoveSplineResponse = 24723u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialStartRequest = 24725u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PickUpDropItemResponse = 24726u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ToughCalcExtraRatioChangePush = 24735u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockInstEntranceResponse = 24736u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TotalTopUpActivityInfoNotify = 24740u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtForcedOccupationResponse = 24742u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayTagPush = 24743u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UiGamePlayRequest = 24744u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikePopularEntriesChangeRequest = 24745u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryBagSizeUpdateNotify = 24747u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDifficultyUpdateNotify = 24752u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AceAntiDataNotify = 24754u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScheduleRewardResponse = 24763u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerScoreTaskUpdateNotify = 24764u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTraceRequest = 24772u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisItemResponse = 24774u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityFoundationCoreChangeNotify = 24775u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionRelatedEntityInfoNotify = 24779u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushBuffChooseResultResponse = 24781u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecWorldInfoFlowRequest = 24782u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveActivityInfoRequest = 24785u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmShipStartNotify = 24795u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OnlineMotorActivityLevelRequest = 24796u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CharacterLookAtNotify = 24799u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AtomicProcessTeleportRequest = 24800u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WellStreamingFinisResponse = 24801u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveInstanceTimerRequest = 24804u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TriggerExitSkillPush = 24805u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorNewCanUnLockNotify = 24807u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StorageInfoUpdateNotify = 24810u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockSplitClientLoginPush = 24812u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopResponse = 24814u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelSoarRewardResponse = 24818u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VisionTriggerNotify = 24819u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TopPhantomEquipGroupResponse = 24824u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTaskAwardRequest = 24834u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoSettlementNotify = 24835u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyAdventurePtRewardRequest = 24837u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchBattleModeNotify = 24840u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomCollectReceiveRequest = 24841u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanSetFiveStarSwitchResponse = 24842u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RobotDestinationPush = 24844u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleQuestPointStateResponse = 24846u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillNodeNotify = 24848u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetDetectionTargetResponse = 24853u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HeadIdUpdateNotify = 24865u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerResultNotify = 24868u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestTreeInfoNotify = 24869u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemSequenceFrameEndRequest = 24870u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbUpLevelRoleResponse = 24873u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HoldWeaponPush = 24879u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AtomicProcessRemoveBuffResponse = 24883u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingActivityMilestoneItemNumNotify = 24887u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GravityFlipInteractRequest = 24889u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerTitleUpdateNotify = 24894u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopBuyRequest = 24895u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NetTestDataPush = 24898u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmSetRedDotRequest = 24911u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityLivingStatusNotify = 24917u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillQuickLevelUpResponse = 24928u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EndSkillResponse = 24932u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OpenSystemBoardResultRequest = 24936u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelTaskRewardRequest = 24943u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReportPlayerRequest = 24953u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomItemRequest = 24954u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsNormalAwardResponse = 24955u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatHistoryResponse = 24958u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryActivityInfoResponse = 24959u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KickMatchTeamPlayerRequest = 24963u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateChangedPush = 24970u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelLevelUpRequest = 24973u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLifeSupportUpRequest = 24974u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SyncPlayerLocationNotify = 24978u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlSettleResponse = 24979u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseAuxiliaryLevelUpResponse = 24981u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RefreshBuffDurationPush = 24982u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CountryExploreScoreInfoResponse = 24983u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleAreaSkillCdNotify = 24988u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ForgeItemResponse = 24992u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeLastInfoResponse = 24998u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulFishingIllustratedRewardRequest = 25002u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TetrisUpdateRequest = 25007u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EquipSkinUnLoadRequest = 25017u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillAddNotify = 25025u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssPluginItemRemoveNotify = 25037u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowStartNotify = 25049u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenInfoUpdateNotify = 25055u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlockPlayerResponse = 25057u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HardnessModeChangedResponse = 25063u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterAreaNotify = 25064u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerNetStateNotify = 25067u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomEquipGroupInfosRequest = 25068u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaInfoRequest = 25069u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HostTeleportUnlockNotify = 25070u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityChangeDynamicInteractTextNotify = 25073u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrialRoleSkinRewardResponse = 25081u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymBeginResponse = 25090u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakFinishResponse = 25091u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledThrowRequest = 25094u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HandInInfoUpdateNotify = 25098u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleDevelopConfigUpdateNotify = 25103u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResetQuestFocusModeNotify = 25104u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestReviewInfoResponse = 25121u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstEntityTeleportResponse = 25123u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleAreaSkillRequest = 25124u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FuncShowRequest = 25127u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomAutoPutRequest = 25130u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageReadRequest = 25131u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ProgressBarFinishResponse = 25134u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieFetchScoreRewardRequest = 25135u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleEnterSharingResponse = 25137u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmPlayMontageResponse = 25141u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttachEntityRequest = 25142u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicUnlockRequest = 25144u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsNormalAwardRequest = 25147u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinAllUnLoadResponse = 25150u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterViewDirectionRequest = 25151u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InputSettingUpdateNotify = 25153u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTechTreeSwitchRequest = 25166u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerRankResponse = 25174u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinWearResponse = 25179u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtForcedOccupationRequest = 25189u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchTeamNotify = 25195u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VisionSkillChangeNotify = 25196u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdventureManualDataRequest = 25198u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestStateUpdateNotify = 25205u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExecuteQteRequest = 25206u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestReviewInfoNotify = 25208u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ZitherPlayStateResponse = 25209u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerScoreRewardReceiveResponse = 25210u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TestDamageRecordNotify = 25211u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushTaskRewardRequest = 25214u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityEnterVehicleResponse = 25217u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchAnimationRequest = 25219u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoMemoryRequest = 25225u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupDeleteResponse = 25229u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChapterUpdateNotify = 25234u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterBoomPush = 25242u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardRewardResponse = 25254u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AcceptFocusWaitQuestRequest = 25258u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBuffProducerOperateRequest = 25261u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoShopRewardSelectRequest = 25262u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsRepeatedTaskRewardRequest = 25268u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveLevelPlayNotify = 25269u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchOperResponse = 25271u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDataNotify = 25272u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveRewardResponse = 25276u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueBlessGroupSelectRequest = 25277u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleEnterSharingRequest = 25279u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyCurrencyNotify = 25282u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveBuffByIdS2cRequestNotify = 25284u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportUpdateNotify = 25294u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialGiveUpTempArchiveResponse = 25299u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EncircleChallengeStartResponse = 25305u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallInfoNotify = 25321u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TutorialUnlockNotify = 25322u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestInstRewardResponse = 25323u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResInstGlobalDataNotify = 25331u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestSettleResponse = 25343u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetAdventureRewardResponse = 25347u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSceneDateRequest = 25350u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SheriffZoneInfoResponse = 25351u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CoopRoleRewardResponse = 25354u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayGainRewardInfoNotify = 25358u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantItemAccessProgressChangeNotify = 25359u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeQuitResponse = 25360u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportDungeonActionNotify = 25362u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsHandBooskUnlockNotify = 25363u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressBuyBonusLvRequest = 25368u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryAreaTaskInfoUpdateNotify = 25370u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportTrialRoleLvUpV2Response = 25380u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeGotoNextRoomRequest = 25389u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoScoreTaskReceiveRequest = 25395u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GolemCrackUpdateResponse = 25396u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCallCardRequest = 25399u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemGiftUseRequest = 25405u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementReceiveResponse = 25408u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryAreaSecretRewardRequest = 25409u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleOperateSelfBgmResponse = 25411u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillCustomResponse = 25414u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleLeaveSlotResponse = 25415u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerTitleRequest = 25420u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengePerRoleLevelNotify = 25423u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherControlInfoRequest = 25430u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InterruptSkillInDelayPush = 25432u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerPhantomAddAttrsResponse = 25433u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreProgressRewardIdsNotify = 25441u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorParkourResultNotify = 25444u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ToughCalcExtraRatioChangeRequest = 25451u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QueryRecallItemBagResponse = 25460u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomPolishResponse = 25461u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallExploreSkillRouletteSetResponse = 25464u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSettingUpdateResponse = 25467u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemFuncValueUpdateNotify = 25472u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerScoreRewardRequest = 25485u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddTemporaryTeleportRequest = 25491u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressBuyBonusLvResponse = 25492u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicSaveResponse = 25499u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmRankListSelfDataRequest = 25501u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchRewardMilestoneRequest = 25505u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDiscardCardResponse = 25508u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ANStartRequest = 25509u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSceneFishCageInfoUpdateNotify = 25515u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PartComponentInitNotify = 25520u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneTestNotify = 25522u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingActivityMilestoneRewardRequest = 25523u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangePlayerFightRoleNotify = 25527u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackCoastThemeStageUpdateNotify = 25531u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisInfoRequest = 25534u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerRoleEnergyResponse = 25538u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneDateNotify = 25540u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlActivityLimitCoinUpdateNotify = 25541u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomVicePolishResponse = 25546u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapReplaceMarkResponse = 25551u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerMonsterHpInfoNotify = 25553u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeChooseDataRequest = 25554u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoGoldAddResponse = 25569u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerDailyTaskRewardRequest = 25570u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportNotify = 25575u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnblockPlayerRequest = 25581u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayUnlimitedModeRequest = 25585u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TreasureChestCountIncrementNotify = 25587u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssSelfPassRequest = 25588u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeWriteCatLevelPlayRewardRequest = 25589u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CircumFluenceTaskRewardRequest = 25593u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherControlRequest = 25604u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExchangeRewardInfoRequest = 25606u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MessageDecodeFailNotify = 25607u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomPutOnRequest = 25608u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorFinishConditionNotify = 25609u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayItemSuccessNotify = 25610u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntranceStateNotify = 25612u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookFullRewardRequest = 25619u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityTimeFlowPush = 25621u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomPolishRequest = 25622u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyInteractionResultNotify = 25625u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDeployNotify = 25628u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldPointRequest = 25630u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimePointActivityRewardRequest = 25635u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetAlertUiVisibleRequest = 25636u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CameraSettingQueryResponse = 25637u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemGiftUseResponse = 25639u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LongShanTaskRewardResponse = 25642u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AlertAreaNotify = 25643u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchEventChoiceRequest = 25648u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RenjuExitMatchedActionRequest = 25656u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomItemAddNotify = 25657u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleMasterLevelRewardRequest = 25661u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleReChallengeResponse = 25662u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GatherTaskRecordNotify = 25663u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomLevelUpRequest = 25666u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitWalkingPatternPointResponse = 25667u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaptureBatchEntityResponse = 25668u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestBuffCountRewardResponse = 25669u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseRefreshGainingGroupRequest = 25671u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomFetterRecommendResponse = 25672u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ANStartResponse = 25684u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CoopRoleRewardRequest = 25686u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BatchMaterialReplaceRequest = 25690u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamTeleportStartNotify = 25696u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationSwitchCurrentRequest = 25699u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerStepUpdateNotify = 25704u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssShowNameRequest = 25707u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillRouletteUpdateNotify = 25728u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CertificateLevelRewardResponse = 25731u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEntitySubTypeChangeNotify = 25732u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGarbStartRequest = 25749u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymUnlockNotify = 25755u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActiveDragonPoolResponse = 25761u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSyncGainingGroupsNotify = 25763u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchLogicStateNotify = 25764u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueRoomInfoNotify = 25772u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockMovementFinishRequest = 25774u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PartUpdatePush = 25777u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DrownRequest = 25778u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LinkageRewardRequest = 25785u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueEventSelectRequest = 25790u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityCalabashSkinChangeNotify = 25793u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CharacterDeathResponse = 25795u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuickHackOpenPush = 25808u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillPullGiantRequest = 25809u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConditionGroupStateRequest = 25810u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingSettleNotify = 25811u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmPlayMontageRequest = 25815u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWhiteCatLimitedRewardResponse = 25823u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PressResponse = 25825u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoRoleRecordRequest = 25830u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportRewardTaskResponse = 25832u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtVarUpdateNotify = 25834u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideTriggerResponse = 25835u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushSettlementResponse = 25837u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FunPlayChallengeAwardRequest = 25841u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrManualCancelTraceRoadResponse = 25842u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRankListResponse = 25849u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerUpdateRecordResponse = 25854u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchStartPlayRequest = 25857u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignDrawRoleResponse = 25860u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakGameStateNotify = 25864u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSelectGainingGroupResponse = 25867u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbUpLevelSkillRequest = 25868u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceRecallQuestRequest = 25878u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestEndNotify = 25888u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionGroupCreateNotify = 25896u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoopTeleportVolumeActionResponse = 25898u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetInstExchangeRewardRequest = 25904u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommonOrganActionListNotify = 25907u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SitChairRequest = 25917u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityRandomInteractResponse = 25922u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterAttributeNotify = 25923u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ButtonIsEnableResponse = 25924u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSellPreviewRequest = 25932u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingQuickSellPreviewResponse = 25935u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThrowDamageRequest = 25936u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayRewardNotify = 25939u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReceiveRechallengeRequest = 25942u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockMarkNotify = 25945u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    Summon3Response = 25946u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MobileButtonSettingUpdateRequest = 25947u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopBuyResponse = 25948u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EquipTakeOnNotify = 25950u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleMotionFinishConditionNotify = 25957u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FollowTrackRequest = 25969u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LowMemoryChangeSceneStartNotify = 25971u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantItemUnlockNotify = 25972u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveForbidControlNotify = 25975u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2ManualCancelTraceTreeRequest = 25977u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchOutResponse = 25979u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InvalidItemResponse = 25982u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HandInMingSuResponse = 25984u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbOverRoleResponse = 25986u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinTrialSettleNotify = 25987u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleScoreNotify = 25993u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceQuestNotify = 25995u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FurnitureDiySaveResponse = 25998u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LobbyQueryPlayersResponse = 25999u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MaterialNotify = 26008u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockGamePlayReadyRequest = 26018u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiBlackboardCdNotify = 26019u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomVicePolishAckRequest = 26021u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardInfoUpdateNotify = 26022u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbUpLevelSkillResponse = 26023u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleReconstructCardRequest = 26025u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AppGradeNotify = 26027u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimelineTraceControlRequest = 26029u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkInfoUpdateResponse = 26030u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessResponse = 26035u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyGameplayEffectNotify = 26040u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanSetPlanStatusResponse = 26043u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2ManualSwitchTraceTreeResponse = 26046u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrArchiveReadRequest = 26051u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinUpdateNotify = 26056u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingRewardResponse = 26058u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MowTowerSettlementRequest = 26061u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerSettlementRequest = 26063u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchAcceptInviteResponse = 26064u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoEndShopStepRequest = 26067u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionFinishResponse = 26069u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtRollbackStartNotify = 26088u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtRollbackInfoNotify = 26092u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlStartFightRequest = 26094u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushBatchClaimRewardResponse = 26097u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefensePreviewFinishResponse = 26099u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolBatchSyncResponse = 26100u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledDestroyRequest = 26102u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRoleRoomNotify = 26103u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanFindPlanResponse = 26108u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopUpdateResponse = 26133u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeWriteCatRewardRequest = 26136u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupNameResponse = 26141u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleRemovePassengerRequest = 26143u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemAiEnableNotify = 26148u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2InfoResponse = 26149u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalDestroyResponse = 26151u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityStaticHookMoveNotify = 26154u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsTalentUnlockNotify = 26156u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityActiveRequest = 26157u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookingDataResponse = 26168u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GmIsOverlapNotify = 26170u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPosAbnormalRequest = 26177u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityPreOpenResponse = 26181u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerDieNotify = 26184u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlockPlayerRequest = 26186u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikePopularEntriesInfoRequest = 26192u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessRewardRequest = 26198u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecFBRoundStartFlowResponse = 26201u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LongShanTaskRewardRequest = 26202u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomIdentifyRequest = 26204u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VfxNpcPatrolFinishRequest = 26210u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkInfoUpdateRequest = 26212u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerGameTokenResponse = 26225u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvignonRewardResponse = 26226u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropCatchLevelRewardRequest = 26230u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingIllustratedRewardInfoUpdateNotify = 26235u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchCharacterStateResponse = 26238u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetAdventureRewardRequest = 26242u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerSeasonScoreRewardRequest = 26245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolOneKeyGalleryRewardRequest = 26247u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbRoleExpNotify = 26249u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeChooseDataNotify = 26262u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryUnlockSlotRequest = 26265u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballSetPayloadResponse = 26267u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockBatchCollectRequest = 26268u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryAreaTaskInfoRefreshNotify = 26269u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerRebackSceneNotify = 26270u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TutorialUnlockResponse = 26280u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapCancelTraceResponse = 26282u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonthCardResponse = 26286u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonBuildingDataRequest = 26292u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLimitTaskRewardRequest = 26293u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorNewQuestUpdateNotify = 26296u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCarnivalTaskJumpUpdateNotify = 26302u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestGiveUpNotify = 26304u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillAddResponse = 26311u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemLockRequest = 26312u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RenameFormationRequest = 26314u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillBranchModifyRequest = 26316u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResMoodUpdateNotify = 26318u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ForgeFormulaUnlockResponse = 26326u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBlackboardResponse = 26328u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockResetGamePlayNotify = 26331u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingIllustratedRewardRequest = 26334u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveRewardRequest = 26335u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayNextDayResponse = 26348u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoRefineWeaponNotify = 26350u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ArtemisNodeUpdateRequest = 26355u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchCharacterStateRequest = 26359u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalDestroyRequest = 26360u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapRemoveAllMarkRequest = 26361u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsTaskRequest = 26366u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2LevelUpRequest = 26367u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkTopicSelectResponse = 26371u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRoundInfoNotify = 26380u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayGachaResponse = 26388u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MiniWriteLetterSaveContentRequest = 26392u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanBatchOperRequest = 26395u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinChangeRequest = 26398u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmRankListRequest = 26399u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThrowDamageResponse = 26400u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerRequest = 26406u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayGmInfoUpdateNotify = 26408u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerLivingStatesNotify = 26412u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldLevelPlayResponse = 26415u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignSkinRewardResponse = 26418u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RelationIdNotify = 26419u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MaterialReplaceRequest = 26427u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseItemUpdateNotify = 26436u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeHeadPhotoRequest = 26439u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LineCrossChallengeStartRequest = 26440u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EquipSkinTakeOnResponse = 26442u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolChangeDirResponse = 26449u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestFinishListNotify = 26450u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanSaveUsePlanResponse = 26457u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoveSceneItemNotify = 26459u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreToolUpdateNotify = 26462u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignPhotoRewardRequest = 26463u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RenjuExitMatchedActionResponse = 26468u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetAlertUiVisibleResponse = 26471u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledShowResponse = 26477u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardSkillResponse = 26492u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingActivityLimitRewardRequest = 26494u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatSendPackRequest = 26497u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleFourCTaskInfoUpdateNotify = 26498u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityIsVisibleRequest = 26500u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCallCardResponse = 26502u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseAuxiliaryResetRequest = 26508u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiInformationNotify = 26510u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsTaskDataUpdateNotify = 26512u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropCatchInfoResponse = 26513u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponBreachResponse = 26514u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerAttributeQueryRequest = 26515u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChatMutePlayerRequest = 26518u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantDeliveryItemRequest = 26525u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstEntranceDetailResponse = 26537u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MaterialResponse = 26538u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherControlInfoResponse = 26543u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FoundationResponse = 26544u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsMonsterConsecutiveKillsNotify = 26546u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleStartResponse = 26552u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmRankListResponse = 26553u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryTopInfoNotify = 26555u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassResponse = 26557u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NameModifyNotify = 26559u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressSetCurUseTrialRoleResponse = 26566u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoFightSettleResponse = 26567u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinTrialUiEndPush = 26571u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnblockPlayerResponse = 26572u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemDecomposePreviewRequest = 26576u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestScoreRewardRequest = 26581u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockUpdateAvailableInputsNotify = 26586u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThroughTrainRequest = 26589u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRewardResponse = 26593u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerFormationRecommendResponse = 26594u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SummonRequest = 26598u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinRequest = 26601u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestNpcMoveOverRequest = 26604u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalAtmosphereUpdateNotify = 26608u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightLevelUpdateNotify = 26610u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideInfoResponse = 26611u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SplineMoveRequest = 26613u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResMoveRequest = 26615u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballTeamReviveRequest = 26619u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelLevelUpResponse = 26622u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoraleTreasureBoxTraceRequest = 26624u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorUseSceneResponse = 26625u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldLevelRegainRequest = 26635u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockResetGamePlayResponse = 26645u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlItemGiveCoinNotify = 26647u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetYuXueModeInfoRequest = 26654u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EndSkillRequest = 26657u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityPointResponse = 26658u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressRepeatedTaskRequest = 26659u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChatResponse = 26663u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSkinChangeResponse = 26665u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowEndRequest = 26672u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HoldHandResponse = 26676u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffEffectPush = 26677u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FeiXuePreheatInfoRewardResponse = 26680u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KickWorldTeamResponse = 26682u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookFullRewardResponse = 26687u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatBeginNotify = 26690u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstResultNotify = 26696u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GmLevelActionResponse = 26699u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSlotCardSkillResponse = 26700u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolOneKeyRewardResponse = 26713u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolStartRequest = 26715u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSlotCardSkillRequest = 26717u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleGuideRewardRequest = 26718u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BatchSynthesisItemResponse = 26720u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CameraSettingModifyResponse = 26725u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomRecommendResponse = 26730u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MainPhantomRecommendResponse = 26732u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerXboxBlockListResponse = 26733u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsLegMatchInfoRequest = 26734u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTraceNotify = 26739u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OutputDebugInfoNotify = 26742u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackCoastThemeActiveRewardRequest = 26746u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailGetAttachmentResponse = 26747u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueArchiveListResponse = 26762u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseGetRewardResponse = 26764u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SplineMoveResponse = 26766u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerPhantomAddAttrsUpdateNotify = 26773u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceQuestRequest = 26774u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEndNotify = 26778u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendRecentlyTeamUpdateNotify = 26784u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassLevelUpRequest = 26786u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatOperateResponse = 26788u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerResetResponse = 26793u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityGravityUpdateNotify = 26798u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MovePlacementRequest = 26801u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FastReturnDungeonRequest = 26812u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSpawnMonsterWaveEndNotify = 26815u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAttachChangeNotify = 26817u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetChapterRewardRequest = 26818u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeekCardInfoRequest = 26823u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrialRoleRewardResponse = 26824u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookEditPresetRequest = 26832u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchRoleNotify = 26835u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressRepeatedTaskResponse = 26837u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockBatchCollectNotify = 26841u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SplineMoveNotify = 26842u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssReviveTimeNotify = 26847u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerHeadUpdateNotify = 26848u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChatMutePlayerResponse = 26851u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangeReadyRequest = 26852u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueGainGetOrLoseNotify = 26853u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldLevelDiffResponse = 26855u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterDrownPush = 26858u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttributeChangedNotify = 26859u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenTaskRewardResponse = 26868u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballSpawnFirstFinishNotify = 26869u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockBatchCollectResponse = 26873u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemSetPosSenderRequest = 26876u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreateBulletPush = 26882u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeSettleNotify = 26883u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyBoardRewardResponse = 26889u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryWeaponDressResponse = 26893u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderRemoveBuffRequest = 26903u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorChangeOutlookResponse = 26904u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnableNearbyTrackingNotify = 26906u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisInfoUpdateNotify = 26909u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheckGearResponse = 26915u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CameraSettingQueryRequest = 26920u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyQuestStateNotify = 26923u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCarnivalSwitchRoleRequest = 26924u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuildingLevelUpResponse = 26925u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlLoseCountUpdateNotify = 26926u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbRoleResonLockFinishNotify = 26928u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfluenceInfoUpdateNotify = 26930u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingCageInfoRequest = 26932u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerMedalInfoRequest = 26935u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedRedDotResponse = 26946u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeScheduleTriggerNotify = 26967u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneGroupDataAndCurFormationEntityRequest = 26969u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestBranchUpdateNotify = 26971u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRoleRewardResponse = 26978u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuildingUnLockRequest = 26985u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTaskOneKeyRewardResponse = 26986u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveMarkInfoNotify = 26990u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyGameplayEffectRequest = 26992u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerMedalInfoResponse = 27000u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueInsListResponse = 27005u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AtomicProcessTeleportResponse = 27008u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomUnlockNotify = 27009u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiControlSwitchRequest = 27014u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightAddCollectionNotify = 27020u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityStateReadyNotify = 27022u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantTotalStableValueUpdateNotify = 27023u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoNextWaveTypeNotify = 27025u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSkillBaitResponse = 27026u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestReadyForGiveUpRequest = 27030u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResSwitchFormationRequest = 27031u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2ScoreRewardResponse = 27040u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyArtifactInfoRequest = 27043u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseChallengeResultNotify = 27045u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherSwitchInfoResponse = 27053u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KickWorldTeamRequest = 27061u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCarnivalSwitchRoleResponse = 27062u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChatNotify = 27064u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalDropRequest = 27068u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSelectReserveCardResponse = 27073u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallItemRewardNotify = 27085u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionResetPosPrePerformanceNotify = 27087u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakTimeRequest = 27089u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TemporaryTeleportAllInfoNotify = 27094u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlEventRefreshResponse = 27098u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCourseV2RewardRequest = 27099u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DestroyBulletRequest = 27103u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InviteRechallengeRequest = 27109u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayOpenTimeNotify = 27112u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseGetSpecialRewardResponse = 27113u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyLastInfoRequest = 27120u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResElementUpdateNotify = 27121u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportActivityTrialRoleUpdateNotify = 27128u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveInstanceTimerNotify = 27135u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleChallengeUpdateNotify = 27137u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HitEndResponse = 27143u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GravityGearResponse = 27144u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScratchCardActivityInfoRequest = 27153u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailBindRewardResponse = 27161u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedReadResponse = 27163u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActiveDragonPoolRequest = 27171u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorChangeOutlookRequest = 27172u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallExploreSkillRouletteNotify = 27174u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerVoxelEnvRequest = 27177u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieAdventureTaskUpdateNotify = 27178u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillRouletteSetResponse = 27182u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetQuestResourceStateResponse = 27184u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerVarNotify = 27186u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrFireNoticeResponse = 27191u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneLoadingFinishRequest = 27192u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropCatchLevelRewardResponse = 27201u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchRefiningRequest = 27203u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWhiteCatRecordResponse = 27210u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookFormulaRequest = 27218u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerInfoUpdateNotify = 27219u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldPointResponse = 27220u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlInstPrepareNotify = 27221u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThemeWorldScoreRequest = 27224u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NavigationFindPathRequest = 27225u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockPointFinishResponse = 27227u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinChangeResponse = 27229u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenLevelUpResponse = 27232u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SignActivitySignStateNotify = 27234u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeGotoNextRoomResponse = 27237u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressSetCurUseTrialRoleRequest = 27245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalTaskRewardRequest = 27247u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerFollowerNotify = 27250u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSettingUpdateRequest = 27251u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheatInputResponse = 27253u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeResultNotify = 27258u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTakeAllRewardResponse = 27259u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LineCrossActivityUpdateNotify = 27261u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryItemCollectionRequest = 27262u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NormalItemUpdateNotify = 27265u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenMotorRewardRequest = 27266u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AccessForceClosedAreaNotify = 27267u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TutorialReceiveRequest = 27270u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassRecurringTakeResponse = 27272u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerRewardRequest = 27282u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeUnlockTeleporterNotify = 27289u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingCabinPutRequest = 27290u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopUpdateResponse = 27292u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopBuyResponse = 27294u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryResidentTaskRewardRequest = 27298u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightOneKeyRewardRequest = 27302u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotographPush = 27304u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingIllustratedRewardResponse = 27309u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerVoiceLanguageResponse = 27315u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerResetRequest = 27317u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseAuxiliaryBranchResponse = 27327u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledEntityHoverResponse = 27351u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatValDecayBeginNotify = 27363u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTakeRewardRequest = 27378u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorParkourStartNotify = 27385u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkTopicSelectRequest = 27388u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityIsVisibleNotify = 27390u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueQuitRequest = 27391u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardAttrInfoNotify = 27398u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatDataMaxNotify = 27399u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityOnLandedResponse = 27404u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolReachEndingRequest = 27408u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantStableValueActivityResponse = 27413u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatDataResponse = 27414u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivateBuffRequest = 27416u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ServerCommandNotify = 27430u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushBatchClaimRewardRequest = 27431u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchRewardTaskRequest = 27434u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestScoreRewardResponse = 27437u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResonantChainOptionalLimitResponse = 27438u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsMatchInfoResponse = 27440u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleAntiCheatingLogNotify = 27447u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchRoleRequest = 27457u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheckGearRequest = 27460u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingCabinPutResponse = 27464u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBeamReceiveResponse = 27467u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoMemoryRewardRequest = 27468u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LinkingStateNotify = 27470u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeeklyFrameworkScoreRewardRequest = 27471u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAdsorbResponse = 27477u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchRequest = 27478u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenLevelUpRequest = 27479u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakResponse = 27480u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CharacterMoveToPointEndPush = 27483u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SunSpiritCollectNotify = 27484u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulExploreScoreRewardResponse = 27486u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchFirstEnterRequest = 27487u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashSkinTakeOnRequest = 27489u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MowTowerSettlementResponse = 27490u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallItemBagDeltaNotify = 27494u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayFastReturnPosRequest = 27495u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryScoreRewardResponse = 27500u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RbBlockStateChangeNotify = 27504u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LandingDamageRequest = 27510u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsOpDoneRequest = 27513u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorAcceptQuestRequest = 27516u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LandingDamageResponse = 27519u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDecalMotorIpResponse = 27523u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerStageRetryResponse = 27529u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerStartResponse = 27533u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseChallengeQuitResponse = 27534u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldTeamPlayerInfoChangeNotify = 27539u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityEnterVehicleRequest = 27542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerSelfPassRequest = 27544u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeStateConfirmNotify = 27547u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GravityHookLockPointChangeGravityRequest = 27548u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDecalMotorIpRequest = 27551u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MaterialPush = 27552u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnableDamageRecordRequest = 27554u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonRolePropChangeNotify = 27561u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConnectorCanConnectRequest = 27563u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReorderFormationRequest = 27566u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTaskOneKeyRewardRequest = 27567u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCarnivalAwardRequest = 27569u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CoopRoleInfoUpdateNotify = 27573u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionFinishRequest = 27577u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EndSkillNotify = 27580u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryMascotRewardRequest = 27581u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleReChallengeRequest = 27585u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDiscardCardNotify = 27588u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightMonsterDropNotify = 27596u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiBlackboardsResponse = 27598u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonSettleResponse = 27600u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityLevelRequest = 27602u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetTraceQuestYuXueModeRequest = 27604u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiHateRequest = 27610u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayWeeklyNotify = 27614u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AreaTerminalPinOperationResponse = 27615u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryEquipRoleResponse = 27622u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BookItemUpdateNotify = 27626u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationSwitchRoleResponse = 27628u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookDeletePresetRequest = 27629u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionNotify = 27631u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRefreshNextWaveGroupResponse = 27635u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWhiteCatDataUpdateNotify = 27640u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateInitResponse = 27644u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieMainTaskUpdateNotify = 27645u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CompleteMarkNotify = 27647u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoveSceneItemResetPositionRequest = 27648u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnrichmentAreaResponse = 27649u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerResetRequest = 27650u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomRefiningResponse = 27651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageShowChangeResponse = 27652u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRoleInstStartRequest = 27659u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerEnterPollutionRequest = 27660u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTaskResponse = 27662u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityEquipChangeNotify = 27672u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDevelopTaskUpdateNotify = 27674u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AtomicProcessAddBuffRequest = 27678u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestBuffUnlockRewardResponse = 27680u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveMatchTeamRequest = 27683u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstFightEndPush = 27687u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendDeleteRequest = 27693u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballFriendRankRequest = 27697u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanUsePlanRequest = 27699u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleTaskRewardResponse = 27700u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NavigationFindPathResponse = 27703u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SignActivityFreeDropRequest = 27704u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResOpDataNotify = 27709u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceChallengeQuitRequest = 27718u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkInfoNotify = 27725u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoResTaskUpdateNotify = 27726u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTechLevelUpRequest = 27727u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstTimeoutNotify = 27732u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmTaskOneKeyRewardRequest = 27736u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoLevelRecordDeleteResponse = 27741u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsMatchInfoRequest = 27743u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomRefiningRequest = 27747u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FirecrackerEntityCreatedNotify = 27748u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeTransRequest = 27756u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnableDamageRecordResponse = 27761u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BoardCanMovePlacementNotify = 27769u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoShopRewardRefreshRequest = 27770u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmRoleUpdateNotify = 27775u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchFirstEnterResponse = 27776u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterPatrolPointReachedRequest = 27779u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AwakeItemVehicleRequest = 27784u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleChangeNameNotify = 27785u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TreasureBoxSlotAllInfoNotify = 27789u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PreheatSignRewardResponse = 27792u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyJoinWorldNotify = 27800u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecWorldStartFlowRequest = 27803u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvoidBlockSubmitOverNodeResponse = 27806u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolSetFlowResponse = 27809u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerSaveRecordResponse = 27817u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideTriggerRequest = 27818u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FoundationCoreOperateRequest = 27836u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrialRoleSkinRewardRequest = 27840u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResetBabelTowerLevelResponse = 27850u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoShopRewardLockRequest = 27851u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageShowChangeRequest = 27855u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleShowListUpdateNotify = 27858u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateTimerInfoNotify = 27863u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerTeleportStateNotify = 27864u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShieldUpdateNotify = 27866u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdatePhantomEquipGroupResponse = 27868u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnrichmentAreaRequest = 27870u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleShowListUpdateRequest = 27889u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LobbyQueryPlayersRequest = 27890u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportFlowNotify = 27892u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResOpDoneRequest = 27894u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayerRewardHintNotify = 27910u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetFanNumberOfTurnsResponse = 27911u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementFinishRequest = 27912u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRewardRequest = 27914u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreActivityTaskRewardRequest = 27918u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffEffectExecuteResponse = 27923u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherSwitchInfoRequest = 27924u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestRollBackEndNotify = 27925u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestRollBackEndNotify = 27936u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TotalTopUpRewardRequest = 27942u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressBonusRequest = 27943u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityIsVisibleResponse = 27947u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayTributeResponse = 27951u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeLevelInfoUpdateNotify = 27954u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SysErrorNotify = 27956u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueResourcesUpdateNotify = 27960u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassPortalResponse = 27969u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MontagePlayRequest = 27974u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessDrawCardResponse = 27976u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssPluginPutRequest = 27978u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthdayShowSetRequest = 27980u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlBagOperateRequest = 27984u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrnamentUnlockNotify = 27985u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetLegMatchSettleNotify = 27991u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GivebackInfoUpdateNotify = 27995u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HitResponse = 27996u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingShipForceBackNotify = 28002u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResEndingRewardRequest = 28009u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyStartRequest = 28012u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestChangeTraceNotify = 28015u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleUpdateNotify = 28018u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlEventRefreshRequest = 28024u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherControlResponse = 28028u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrampleGearTransitionNotify = 28029u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeCheckResponse = 28031u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InterruptSkillInDelayResponse = 28034u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelTaskRewardResponse = 28036u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackCoastThemeActiveRewardResponse = 28050u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailBindResponse = 28055u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillCustomRequest = 28056u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookTaskRewardRequest = 28058u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeBossInstStartRequest = 28063u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsTaskResponse = 28070u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillLevelUpViewRequest = 28071u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsRankRequest = 28072u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceModifyRequest = 28074u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopBuyRequest = 28078u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TotalTopUpScoreInfoResponse = 28081u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityItemNumUpdateNotify = 28082u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayFirstNotify = 28089u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreProgressRewardResponse = 28094u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattlePhantomCardSkillRequest = 28104u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSlotUpdateRequest = 28106u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimelineTraceExitRequest = 28107u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightTaskUpdateNotify = 28108u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResRoomInfoNotify = 28115u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeTaskInfoUpdateNotify = 28118u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkSettleRequest = 28130u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsSettleNotify = 28131u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushLevelInfoNotify = 28132u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushTaskUpdateNotify = 28139u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulAchievementReceiveRequest = 28143u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyResultRequest = 28144u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSlotInsteadRequest = 28150u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyTaskRewardRequest = 28152u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsStepAdvanceRequest = 28159u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterDetectionInfoRequest = 28163u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TestSpawnTemplateEntityPush = 28168u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRankListSelfDataRequest = 28172u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimePointActivityBatchRewardRequest = 28173u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbGetRoleListResponse = 28176u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulFishingIllustratedRewardResponse = 28177u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerEndNotify = 28183u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterBoomResponse = 28184u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueLootChangeResponse = 28188u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldLevelDownResponse = 28190u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrArchiveTaskRewardResponse = 28194u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCourseV2RewardNotify = 28195u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulRogueWeeklyRewardResponse = 28198u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FunPlayChallengeInfoUpdateNotify = 28208u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopInfoUpdateNotify = 28209u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangePlayerTitleRequest = 28211u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoSellWeaponRequest = 28213u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchWeeklyResponse = 28219u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestBuffUpdateNotify = 28221u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleHandCardInfoUpdateNotify = 28224u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyAdventureTaskUpdateNotify = 28227u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InputSettingRequest = 28228u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResGridEventResponse = 28230u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessUseSkillResponse = 28232u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowShowEntityNotify = 28233u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OnlineMotorEndNotify = 28235u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopDirectBuyRequest = 28237u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingIllustratedInfoUpdateNotify = 28244u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowTeleportToPlotPosResponse = 28245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CancelQuestFocusModeResponse = 28253u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapReplaceMarkRequest = 28254u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerTaskRewardRequest = 28256u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GravityGearRequest = 28261u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeInstNotify = 28262u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaResponse = 28271u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestRedDotRequest = 28280u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsInstGlobalDataNotify = 28285u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityLevelDiffResponse = 28299u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientPullResourcePackageRequest = 28300u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialSelectBossResponse = 28302u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddHackingEntityNotify = 28303u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardOutLookUpResponse = 28304u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustHandInResponse = 28305u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookingFormulaUpdateNotify = 28308u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueGiveUpGainRequest = 28315u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneLoadingFinishNotify = 28319u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueResultRequest = 28320u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueArchiveListRequest = 28324u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewBieCourseRewardRequest = 28328u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlSettleRequest = 28335u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerSeasonTaskDataUpdateResponse = 28342u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmTaskOneKeyRewardResponse = 28347u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeResponse = 28350u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddUnlockedGuideNotify = 28351u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResInstResultResponse = 28357u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockExitGamePlayRequest = 28361u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmResetNotify = 28366u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MingSuHandRewardRequest = 28370u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterViewDirectionResponse = 28371u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockSplitHumanChangleNotify = 28372u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetBaoziStateRequest = 28381u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerStageRetryRequest = 28382u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResGridDataUpdateNotify = 28389u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveBuffS2cRequestNotify = 28392u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionOperationScreenSuccessResponse = 28397u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LobbyListRequest = 28398u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExitViewDirectionResponse = 28401u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBdGroupUnlockNotify = 28407u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonIllustratedNotify = 28408u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaAccumulateInfoRequest = 28411u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerShowNameResponse = 28419u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoRefineWeaponRequest = 28420u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuildingUnLockResponse = 28422u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanBatchOperResponse = 28424u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SplinePositionNotify = 28425u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerScoreRewardRequest = 28427u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReceivedSilentFirstAwardResponse = 28437u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VisionTriggerPush = 28446u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewLinkBurstPush = 28450u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientPullResourcePackageResponse = 28454u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResFormationUpdateNotify = 28455u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockPointExitResponse = 28458u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropInBagNotify = 28463u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashSkinTakeOnResponse = 28468u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightTalentUpRequest = 28481u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchThreeStarResponse = 28482u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AfterJoinSceneNotify = 28489u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeEntityRoleResponse = 28494u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayRefreshShopRequest = 28500u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AccessPathConfigRequest = 28506u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResInstOptionsUpdateNotify = 28509u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerScoreUpdateNotify = 28517u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeStateResponse = 28519u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayInfoNotify = 28525u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvoidBlockSubmitOverNodeRequest = 28527u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatMaxCaseMessageRequest = 28528u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbGetRoleListRequest = 28529u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorCycleCruiseStatePush = 28534u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonEntrustDataRequest = 28535u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationAttrResponse = 28542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsLastInfoResponse = 28545u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SelfPortraitStateResponse = 28546u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneGroupDataAndCurFormationEntityResponse = 28552u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ServerConfigVersionInfoNotify = 28553u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ForgeItemInfoUpdateNotify = 28572u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalCollectStateNotify = 28587u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReorderFormationResponse = 28600u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedInfoResponse = 28603u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PortalReplaceNotify = 28606u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGarbInsertCoinRequest = 28609u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterLevelPlayNotify = 28613u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportFinishRequest = 28614u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportToTargetRequest = 28616u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    H5ViewActivityDataNotify = 28624u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DebugFightErrInfoNotify = 28626u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChatRequest = 28634u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCheckCardSkillUnlockRequest = 28636u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterLevelNotify = 28638u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingActivityLimitTaskNotify = 28644u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSkillBaitRequest = 28647u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustAcceptRequest = 28651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlStartFightResponse = 28659u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PilotThrowOperationResponse = 28660u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DestroyBulletPush = 28662u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopInfoResponse = 28666u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ElementalAbilityUpdateNotify = 28668u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantMaxLevelDeliveryItemResponse = 28669u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopAnimRequest = 28674u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GridCellUpdateNotify = 28675u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimerEndRequest = 28680u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoShopRewardSelectResponse = 28684u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifyBulletParamsNotify = 28690u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StopMoveSplineRequest = 28704u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LastBigSceneMiniMapInfoRequest = 28705u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustUpdateNotify = 28710u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MowTowerFirstScoreNotify = 28712u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OnlineMotorSettleNotify = 28720u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopAnimPush = 28729u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SkillRequest = 28732u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGarbInsertCoinResponse = 28733u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWhiteCatLimitedUpdateNotify = 28734u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveTemporaryTeleportResponse = 28735u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorListResponse = 28736u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlaySwitchSportModeResponse = 28737u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TemporaryTeleportChangeNotify = 28744u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchExecuteSkillPlayResponse = 28746u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EncircleChallengeStartRequest = 28751u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleGiftRewardResponse = 28753u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchDirectRefiningResponse = 28755u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsGainDataUpdateNotify = 28759u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CorniceChallengeTransResponse = 28762u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestActionRequest = 28770u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueInstExtraInfoRequest = 28775u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopBuyRequest = 28780u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemAiPatrolPointNotify = 28782u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneLoadingFinishResponse = 28792u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatMessagePrefixInfoRequest = 28795u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SunSpiritUpdateNotify = 28796u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFastReturnPosResponse = 28798u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeCheckRequest = 28799u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceRecallQuestResponse = 28806u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddChapterResultRequest = 28807u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateOwnerMingSuGenNotify = 28808u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeHeadPhotoResponse = 28817u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseUseItemResponse = 28819u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoadEquipInfoRequest = 28824u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceSelfPassResponse = 28825u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DamageExecuteNotify = 28829u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportDungeonForbidNotify = 28830u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BehaviorTreeDeleteNotify = 28831u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonActivityRewardRequest = 28834u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemMoveSplineRequest = 28835u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DirectTrainInfoNotify = 28851u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamParkourRewardResponse = 28854u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2TreeBuildResponse = 28858u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationAutoAddRoleNotify = 28861u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeletePhantomEquipGroupRequest = 28863u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemDisuseResponse = 28866u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPreloadNotify = 28870u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StartSetQuestFocusNotify = 28873u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorPositionStatePush = 28875u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerUpdateRecordNotify = 28883u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SignatureUpdateNotify = 28884u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlRoundSwitchNotify = 28886u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SummonRandomNotify = 28895u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomDirectRefiningWeeklyResetNotify = 28896u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponItemRequest = 28901u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombineEntitiesRequest = 28910u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SolarSchoolBatchSyncRequest = 28917u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlFightOverRequest = 28918u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdatePlayerSingleFightRoleNotify = 28925u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopInfoResponse = 28926u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveSummonEntityResponse = 28927u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerStepAdvanceResponse = 28939u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadNetworkEntityStartNavNotify = 28943u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InviteRechallengeNotify = 28944u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaptureBatchEntityRequest = 28951u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoAllItemUpdateNotify = 28952u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CameraSettingModifyRequest = 28953u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceResponse = 28955u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReplaceVehicleEntityNotify = 28957u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSettingBatchUpdateResponse = 28959u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryMascotRewardResponse = 28960u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceDeleteResponse = 28966u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestFinishActionRequest = 28969u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityVarUpdateNotify = 28972u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SyncSceneTimeNotify = 28973u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementUpdateRequest = 28975u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmPlayMontagePush = 28981u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashLevelRewardRequest = 28983u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerXboxSessionNotify = 28993u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonthCardDailyRewardNotify = 28994u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightEnterSubLevelRequest = 28999u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLifeSupportUpResponse = 29000u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActorVisibleNotify = 29002u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResetPointEntityNotify = 29014u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestSettleRequest = 29019u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleTaskInfoNotify = 29022u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityDynamicInteractResponse = 29039u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeCardResponse = 29040u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityWalkingPatternFinishRequest = 29045u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseTechUpdateNotify = 29048u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOnlineRankRuleIdsNotify = 29052u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFinishActionEndRequest = 29054u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DrownPush = 29058u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DestroyBulletResponse = 29062u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReceiveRechallengePlayerIdsNotify = 29063u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerPreUnlockAvailableNotify = 29069u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleUpdateDevelopTargetNotify = 29070u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityPayShopBuyResponse = 29072u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsLegMatchInfoResponse = 29075u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShowPasserByNpcNotify = 29077u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingTechInfoUpdateNotify = 29078u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailDeleteNotify = 29079u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConnectorConnectEntityNotify = 29082u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoLimitTaskUpdateNotify = 29083u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageChatThemeChangeRequest = 29084u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityIsVisiblePush = 29093u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResInstStartResponse = 29103u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PickUpDropItemRequest = 29110u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementListProgressNotify = 29111u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PsnSettingRequest = 29119u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantSystemInfoNotify = 29120u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerXboxInfoGetResponse = 29123u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RunTestRequest = 29128u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyQuestCancelNotify = 29129u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleMotionUnLockRequest = 29130u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeSubLevelNotify = 29131u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopInfoNotify = 29139u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2ScoreRewardRequest = 29142u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CharacterMoveToPointNotify = 29143u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LstBattleRecordRequest = 29144u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimelineTraceStartRequest = 29145u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoadEquipInfoResponse = 29155u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorCreateRequest = 29157u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaUsePoolRequest = 29160u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerSaveDeleteRequest = 29169u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtSuspendNotify = 29172u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerMotionResponse = 29174u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTalentLevelUpRequest = 29178u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEntityBuffLayerCountNotify = 29187u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LongShanScoreRewardResponse = 29191u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueLevelPlayNotify = 29192u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomInteractionInfoUpdateNotify = 29193u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfluenceInfoRequest = 29194u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GatewayEchoRequest = 29209u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapRemoveMarkResponse = 29212u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerHeadAddNotify = 29216u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieFetchScoreRewardResponse = 29217u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientCurrentRoleReportPush = 29219u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlFighterAttrChangeNotify = 29224u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GatherActivityRewardResponse = 29225u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowActionResponse = 29226u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDealCardReplaceResponse = 29228u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FurnitureUnlockNotify = 29232u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueGotoNextRoomCommitResponse = 29236u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryActivateTalentRequest = 29239u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSkillEffectFailNotify = 29240u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleBreakThroughViewResponse = 29247u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerPhantomAddAttrsRequest = 29253u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchExecuteSkillPlayRequest = 29254u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchThreeEndRequest = 29259u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestBuffUnlockRewardRequest = 29264u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddDecalRequest = 29268u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetBaoziStateResponse = 29269u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DirectTrainInfoRequest = 29272u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThroughTrainResponse = 29273u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RolePropRequest = 29283u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressTaskResponse = 29284u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FireShopCoinNotify = 29285u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrFireNoticeRequest = 29298u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResOpDataUpdateNotify = 29300u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ToughCalcExtraRatioChangeResponse = 29306u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerSkillInfoPbNotify = 29311u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayStateResponse = 29313u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyBoardRewardRequest = 29315u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageReceivedRequest = 29328u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseRefreshShopResponse = 29329u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorBattleContextNotify = 29330u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AcceptEntrustRequest = 29331u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleGiftRewardRequest = 29332u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QingXiaoTaskRewardRequest = 29336u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleMotionNewCanUnLockNotify = 29340u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBvBLoadingFinishResponse = 29345u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardRoleTargetInfoRequest = 29346u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreatStoryCharacterRequest = 29348u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuyShopProductResponse = 29351u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionResetPosPrePerformanceEndResponse = 29352u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthdayInitResponse = 29356u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestReadyListNotify = 29359u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiControlSwitchResponse = 29374u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieAdventureTaskRewardRequest = 29376u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrnamentDressInfoUpdateNotify = 29379u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MovePlacementResponse = 29380u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorListNotify = 29381u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SignActivityRequest = 29384u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopDirectBuyResponse = 29388u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushChooseBuffRequest = 29389u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingLevelInfoUpdateNotify = 29397u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowSeqSetPlayerPosRequest = 29398u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeGiveUpGainRequest = 29402u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiftPackPreviewRequest = 29403u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResGainDataUpdateNotify = 29404u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerRankListRequest = 29408u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerRewardTaskReceiveRequest = 29411u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifyBulletParamsRequest = 29414u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWhiteCatLimitedRewardRequest = 29426u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomEquipInfoNotify = 29430u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatMessagePostInfoResponse = 29434u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillQuickLevelUpRequest = 29438u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDevelopTaskRewardResponse = 29442u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityMotorOutlookChangeNotify = 29444u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaughtNotify = 29446u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreProgressRewardRequest = 29451u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayRefreshGachaResponse = 29452u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchDirectRefiningRequest = 29456u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WaitQuestConfirmResourceNotify = 29463u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerResetResponse = 29466u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendRemarkResponse = 29476u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreEntityTraceResponse = 29477u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendAllRequest = 29479u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiftPackPreviewResponse = 29486u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefencePlayerReviveNotify = 29503u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThroughTrainForceRemindNotify = 29505u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceRandListResponse = 29510u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeeklyFrameworkInfoRequest = 29511u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTrialUiEndPush = 29512u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueShopBuyResponse = 29518u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleNpcShowOverRequest = 29519u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockMultiMapNotify = 29531u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopInfoRequest = 29540u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveGameplayEffectPush = 29542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackSwordChallengeMarkItemPanelInfoRequest = 29544u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetLegMatchResultNotify = 29552u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantEcoUnlockNotify = 29556u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EndLessHistoryResponse = 29560u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2LevelUpResponse = 29561u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeControlRoleNotify = 29562u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestRedDotResponse = 29563u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballRoleLevelUpResponse = 29568u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopUpdateRequest = 29578u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockSplitPlayerNeedBlockPush = 29579u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookFoodRequest = 29582u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockSyncInfoNotify = 29588u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomAttrRecommendResponse = 29590u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SheriffCriminalUpdateNotify = 29606u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseAuxiliaryResetResponse = 29607u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsGearResponse = 29611u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThemeCeleWuWuTaskNotify = 29613u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleUpdateDevelopTargetRequest = 29614u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestBranchSelectResponse = 29618u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GravityFlipUpdateTypeNotify = 29623u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustTraceResponse = 29628u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueArchiveSaveResponse = 29633u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideGroupResetNotify = 29638u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleElementChangeRequest = 29639u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomFetterRecommendRequest = 29643u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityOnLandedNotify = 29646u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomLevelUpResponse = 29647u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlCoinUpdateNotify = 29648u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessDrawCardRequest = 29650u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTaskTakeRequest = 29651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballStartNotify = 29654u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FollowerChairPresentationChangeNotify = 29665u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimerEndResponse = 29668u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerAccessRangeResponse = 29671u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthdayShowSetResponse = 29672u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtCancelRangeFailWarningNotify = 29677u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassRecurringTakeRequest = 29679u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoSettlementRequest = 29686u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateInstanceOwnerInfoNotify = 29689u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleQuestPointStateRequest = 29691u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowEndNotify = 29697u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerInfoResponse = 29704u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlEventSelectResponse = 29706u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTowerAttributeQueryResponse = 29708u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BoneVisibleChangeNotify = 29713u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangePlayerUiStateRequest = 29714u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerHandFoundationCoreChangeNotify = 29717u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivateBuffNotify = 29719u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingQuickSellPreviewRequest = 29724u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallExploreSkillRouletteSetRequest = 29727u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoralePosResponse = 29731u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTaskAwardResponse = 29739u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConnectorConnectEntityRequest = 29745u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRoleRewardRequest = 29748u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    Summon3Request = 29752u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementProgressNotify = 29757u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSettingResponse = 29760u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleAreaSkillResponse = 29761u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldPointRepeatedRequest = 29763u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTakeRewardResponse = 29764u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceEnterInstNotify = 29765u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReceiveRechallengeNotify = 29770u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockSplitSwitchStatePush = 29772u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkInfoRequest = 29776u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyGotoNextRoomResponse = 29783u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResLastInstInfoRequest = 29790u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueInsListRequest = 29791u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyRechallengeResponse = 29801u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GmLevelActionRequest = 29805u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChatMutePlayerListNotify = 29806u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiBlackboardCdResponse = 29807u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanFindPlanRequest = 29810u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressTrialRoleLvUpResponse = 29813u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTalentInfoResponse = 29814u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchSettleResponse = 29820u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedUnlockNotify = 29822u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoRoleRecordNotify = 29827u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopAnimResponse = 29834u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerRecommendRequest = 29840u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchConfirmNotify = 29850u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreProgressResponse = 29853u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrInfoResponse = 29855u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeCurrencyNotify = 29861u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessTaskTakeRequest = 29864u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowEndResponse = 29872u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportSetCurUseTrialRoleResponse = 29875u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleDevelopConfigRequest = 29877u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalDropResponse = 29883u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSkillTriggerInfoNotify = 29886u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeWeatherRequest = 29890u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinUnLoadResponse = 29892u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopSellRequest = 29894u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTotalShopItemUpdateNotify = 29902u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueRefreshGainRequest = 29906u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressDisposableRewardRequest = 29911u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchEventChoiceResponse = 29916u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemStopRequest = 29926u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashMsgNotify = 29927u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResCurrencyNotify = 29934u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NpcTraceFailedRequest = 29936u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PreAiControlSwitchNotify = 29939u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueChooseDataResultRequest = 29940u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTaskRewardTakeRequest = 29942u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportTransferResponse = 29947u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveGameplayEffectResponse = 29948u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerPsnInfoGetRequest = 29956u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThrowDamageRecoveryNotify = 29960u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityRewardItemNotify = 29972u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatReceivePackNotify = 29973u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecRoleFightFlowResponse = 29975u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SplinePositionUpdateResponse = 29976u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseDetectionSkillRequest = 29977u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityInteractResponse = 29979u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EquipTakeOnResponse = 29980u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LogicStateInitResponse = 29984u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikePopularEntriesInfoResponse = 29994u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThemeWorldScoreResponse = 29997u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateInitRequest = 29999u16,
}
