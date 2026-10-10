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
    HonamiStoryRoleUpdateNotify = 15005u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeBoxExpNotify = 15006u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ArtemisNodeUpdateNotify = 15008u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimePointActivityBatchRewardRequest = 15010u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayOpenResponse = 15023u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockToggleHintRequest = 15024u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FollowTrackRequest = 15030u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GmLevelActionRequest = 15038u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledEntityHoverResponse = 15043u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlInstEventSelectNotify = 15046u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleQuestPointStateRequest = 15049u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestRollBackEndNotify = 15053u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerLeaveWorldTeamNotify = 15054u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeLevelInfoUpdateNotify = 15056u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityCalabashSkinChangeNotify = 15059u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityRewardItemNotify = 15063u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonthCardRequest = 15066u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackSwordChallengeInfoResponse = 15067u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaptureEntityRequest = 15078u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLimitTaskRewardRequest = 15084u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingInstNotify = 15085u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockMapBlockNotify = 15090u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HitRequest = 15093u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelSoarRewardResponse = 15096u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResonantChainUnlockRequest = 15098u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushTaskRewardResponse = 15100u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AwakeItemVehicleResponse = 15101u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationSwitchCurrentResponse = 15112u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThroughTrainRequest = 15113u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseGetSpecialRewardRequest = 15114u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabTimeBallRequest = 15115u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CoopRoleRewardRequest = 15123u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignDrawRewardRequest = 15126u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerMedalInfoResponse = 15134u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstResultNotify = 15136u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsLastInfoResponse = 15138u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinWearRequest = 15148u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangeReadyResponse = 15160u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GivebackInfoRequest = 15161u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRewardResponse = 15163u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialSelectBossRequest = 15164u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapRemoveAllMarkRequest = 15166u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResGotoNextRoomRequest = 15168u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsRepeatedTaskRewardResponse = 15170u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveActivityScoreResponse = 15172u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WuWuKujiGachaResponse = 15175u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoonPhaseRandomRequest = 15178u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VisionSkillChangeNotify = 15184u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWhiteCatRecordResponse = 15186u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSceneDateRequest = 15194u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleEnterSlotResponse = 15195u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedRedDotResponse = 15199u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimerEndRequest = 15205u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTrialSceneRollbackPush = 15207u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ANStartResponse = 15208u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageReadRequest = 15211u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GmEntityFsmGroupInfoResponse = 15216u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTalentSkillLevelResponse = 15225u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRefreshBossPush = 15231u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeEndNotify = 15236u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DiscardWeaponRequest = 15239u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FunPlayChallengeAwardResponse = 15240u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangeReadyNotify = 15244u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReceivedSilentFirstAwardResponse = 15246u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TargetGearHitRequest = 15247u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanUsePlanRequest = 15249u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyJoinWorldNotify = 15258u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportRewardTaskResponse = 15261u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerGuideActivityInfoRequest = 15265u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThemeCeleWuWuTaskNotify = 15267u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryInstTopTowerSettleNotify = 15272u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EndSkillPush = 15273u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopLockRequest = 15276u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneModeChangeFinishResponse = 15283u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoMemoryRewardRequest = 15289u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeQuitRequest = 15291u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ArtemisNodeUpdateRequest = 15301u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityLevelResponse = 15302u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeQuitResponse = 15309u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialResultResponse = 15310u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchWeeklyResponse = 15313u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VisionExploreSkillNotify = 15314u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LowMemoryChangeSceneFinishResponse = 15315u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessPlayCardResponse = 15319u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerResultNotify = 15320u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerRoleVoiceSetResponse = 15331u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashLevelsRewardNotify = 15335u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterGachaDataChangeNotify = 15337u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NpcPhantomBattleFightInfoNotify = 15338u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerEndNotify = 15343u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSyncGainingGroupsNotify = 15348u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TetrisUpdateRequest = 15349u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResCurrencyUpdateNotify = 15356u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabStopResponse = 15359u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueEventNotify = 15360u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballFriendRankRequest = 15366u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmStateBehaviorRequest = 15369u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomEquipInfoNotify = 15372u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisInfoResponse = 15373u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorParkourLevelRewardRequest = 15375u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BasicInfoNotify = 15380u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsMatchInfoResponse = 15383u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LanguageSettingUpdateRequest = 15385u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlItemGiveCoinNotify = 15390u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicUnlockRequest = 15391u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingShipSkinChangeResponse = 15401u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemAiPatrolPointNotify = 15402u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoSettlementNotify = 15404u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CancelMatchNotify = 15420u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddTemporaryTeleportInfoNotify = 15428u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardSelectRequest = 15431u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchTeamNotify = 15432u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayVarRequest = 15438u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreateBulletPush = 15442u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbUpLevelRoleRequest = 15445u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledEntityHoverRequest = 15453u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendRecentlyTeamRequest = 15455u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstPlayDataNotify = 15456u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestTreeInfoNotify = 15465u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResOpDataUpdateNotify = 15468u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherControlUnlockNotify = 15470u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulGetAdventureRewardRequest = 15472u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RunTurntableActivityRequest = 15475u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemMoveTargetNotify = 15478u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LstBattleRecordResponse = 15485u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockSplitSwitchStatePush = 15490u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestBuffCountRewardRequest = 15493u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopBuyResponse = 15499u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatMessagePostInfoRequest = 15505u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LifePointChallengeUpdateNotify = 15515u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerRecommendResponse = 15516u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoShopRewardSelectResponse = 15517u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportSetCurUseTrialRoleRequest = 15519u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsMatchInfoRequest = 15531u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledShowRequest = 15548u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDevelopTaskUpdateNotify = 15550u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StorageInfoUpdateResponse = 15571u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionResetPosPrePerformanceNotify = 15572u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoUpgradeRewardRefreshResponse = 15573u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsResultResponse = 15576u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightMonsterDropNotify = 15577u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateChangedNotify = 15580u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardOutLookUpResponse = 15581u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThemeWorldScoreResponse = 15587u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AwakeItemVehicleRequest = 15589u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TutorialInfoRequest = 15592u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetAlertUiVisibleRequest = 15594u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBlackboardRequest = 15598u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PressGameRequest = 15600u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSkillBombRequest = 15602u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResInstStartResponse = 15616u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchRefiningRequest = 15619u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AcceptEntrustRequest = 15620u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayVarResponse = 15621u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddUnlockedDetectionTextNotify = 15632u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightSelectCollectionRequest = 15634u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmChangePartnerRoleResponse = 15635u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookInfoResponse = 15636u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonBuildingDataRequest = 15645u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulGetAdventureRewardResponse = 15647u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillRemovePush = 15649u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleDevelopConfigResponse = 15651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRoleRoomNotify = 15652u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageInfoRequest = 15653u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingHandInResponse = 15662u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomFetterRecommendResponse = 15665u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoEndSpecialWaveCombatResponse = 15668u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapRemoveMarkRequest = 15669u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchAnimationRequest = 15672u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchCharacterStateNotify = 15678u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoAllItemUpdateNotify = 15679u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OnlineMotorActivityLevelRequest = 15684u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveGuestNotify = 15691u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PreheatSignRewardResponse = 15694u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallExploreSkillRouletteNotify = 15696u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonRoleDataRequest = 15705u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FuncShowRequest = 15710u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeconstructTrapRequest = 15715u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestBranchUpdateNotify = 15721u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeQuitResponse = 15723u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InterruptSkillInDelayResponse = 15726u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerSeasonScoreRewardResponse = 15733u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerUpdateRecordNotify = 15739u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MowTowerLevelsInfoUpdateNotify = 15746u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveTreasureBoxSlotRequest = 15750u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NormalItemAddNotify = 15755u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheckPublicResourceVersionResponse = 15757u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetDetectionLabelInfoRequest = 15760u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyLastInfoResponse = 15761u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceMoonPhaseRewardRequest = 15762u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EncircleChallengeCompleteRequest = 15763u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCheckCardSkillUnlockRequest = 15765u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtRangeFailWarningNotify = 15770u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssLittleRoleLevelUpResponse = 15774u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoPropertyUpdateNotify = 15776u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchDarkTideWeaponPush = 15777u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeekCardInfoRequest = 15779u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DebugFightErrInfoNotify = 15787u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GravityHookLockPointChangeGravityResponse = 15803u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestTreeInfoResponse = 15806u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailBindRewardResponse = 15814u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommitBoardResponse = 15817u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementGroupProgressNotify = 15821u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialReChallengeNotify = 15826u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyAdventureTaskRewardRequest = 15828u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayRewardCountResetNotify = 15831u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseRewardGainingGroupsNotify = 15832u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOnlineProgressReportPush = 15835u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReceiveRechallengePlayerIdsNotify = 15842u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCallCardNotify = 15843u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsOpDataUpdateNotify = 15846u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetPlayerYuXueModeResponse = 15847u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetDebugInfoNotify = 15849u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeekCardRewardRequest = 15854u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReceiveRechallengeRequest = 15865u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenLevelUpResponse = 15881u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchRoundActionResponse = 15882u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlaySelectCardGroupRequest = 15883u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockPointFinishResponse = 15889u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AppGradeNotify = 15895u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchTeamStateNotify = 15902u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardSkillRequest = 15904u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BanItemUseNotify = 15908u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookMotorRewardResponse = 15914u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushSettlementResponse = 15915u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessUpdateNotify = 15921u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleLevelUpViewResponse = 15925u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakGameStateNotify = 15930u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyArtifactInfoResponse = 15940u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SummonEntityNotify = 15942u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherControlInfoResponse = 15945u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangeRoleNotify = 15946u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulExploreScoreRewardResponse = 15959u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityLevelDiffResponse = 15960u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemSequenceFrameEndRequest = 15970u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockBatchCollectNotify = 15974u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FollowerChairPresentationChangeNotify = 15976u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityUseReviveCountNotify = 15978u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerRecommendResponse = 15984u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResGridDataUpdateNotify = 15986u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InteractiveUpdateResponse = 15988u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerPsnInfoGetResponse = 15989u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomFetterRecommendRequest = 15990u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAttachChangeNotify = 15996u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalAtmosphereUpdateNotify = 15997u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillActionResponse = 16000u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballWeaponDegradeResponse = 16001u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WuWuTaskUpdateNotify = 16006u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayOpenTimeNotify = 16016u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestRedDotRequest = 16021u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendApplySendRequest = 16030u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemUseRequest = 16031u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowEndRequest = 16032u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayGiftInfoResponse = 16033u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightAddEnemyBuffNotify = 16034u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DecalAddNotify = 16035u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EquipSkinUnLoadResponse = 16037u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockSplitPlayerNeedBlockPush = 16044u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SysErrorNotify = 16045u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LinkageRewardRequest = 16047u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CertificateLevelRewardRequest = 16054u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NetTestDataRequest = 16056u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchRoleResponse = 16059u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceCreateRequest = 16066u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EquipSkinUnLoadRequest = 16068u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAccessCasketResponse = 16078u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicNotify = 16079u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTrialOpenNotify = 16081u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceRoleReviveNotify = 16084u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideCondDoneNotify = 16087u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemDecomposePreviewResponse = 16088u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LinkageCheckInRewardResponse = 16096u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InviteRechallengeResponse = 16100u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfluenceRewardRequest = 16109u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheckGearResponse = 16110u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementReceiveRequest = 16111u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MingSuHandRewardResponse = 16113u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsGearRefundResponse = 16117u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ContextIdNotify = 16119u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ValidTimeItemRequest = 16123u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleAddBuffInfoNotify = 16131u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterBigWorldInstResponse = 16135u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackScreenStatePush = 16136u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssShowNameResponse = 16143u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssReviveCharacterRequest = 16144u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecRoleFightFlowResponse = 16148u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerPsnSessionNotify = 16152u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityElementalAbilityEnableNotify = 16164u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeStateConfirmPush = 16165u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EffectiveWeekCardInfoNotify = 16179u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreScoreRewardResponse = 16181u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkInfoNotify = 16185u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthDayCardRoleResponse = 16190u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailDeleteNotify = 16201u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FragileChangeResponse = 16203u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnblockPlayerRequest = 16206u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatOperateResponse = 16211u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRoleInstStartResponse = 16214u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSystemInfoUpdateNotify = 16215u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoveSceneItemResetPositionRequest = 16218u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchRewardTaskRequest = 16221u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChatMutePlayerRequest = 16226u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingShipSkinChangeRequest = 16229u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryScoreRewardInfoUpdateNotify = 16232u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnOpenedAreaPullbackResponse = 16235u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDecalMotorIpRequest = 16237u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvoidBlockSubmitOverNodeRequest = 16244u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalDestroyRequest = 16245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2ManualCancelTraceTreeRequest = 16247u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryInstLeaveResponse = 16258u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoralePosResponse = 16263u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GolemCrackUpdateResponse = 16269u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTaskTakeResponse = 16270u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingIllustratedRewardRequest = 16271u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopItemUpdateRequest = 16274u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityResultRewardRequest = 16280u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTechTreeUnlockNotify = 16286u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BoneVisibleChangeNotify = 16295u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAdsorbRequest = 16297u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PreheatSignSurveyInfoRequest = 16302u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayOpenRequest = 16306u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomPutOnResponse = 16317u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangeRoleRequest = 16318u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeInfoNotify = 16321u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FuncOpenUpdateNotify = 16322u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlLoseCountUpdateNotify = 16325u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportToTargetResponse = 16327u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallItemBagRemoveNotify = 16328u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchAcceptInviteNotify = 16329u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestActionResponse = 16333u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopBuyRequest = 16336u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCallCardRequest = 16342u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatDataRequest = 16343u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryInstInfoNotify = 16347u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoMemoryRequest = 16350u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageReceivedRequest = 16353u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestChangeTraceNotify = 16354u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryUnlockSlotRequest = 16355u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleEnterSlotRequest = 16359u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressBonusResponse = 16360u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeQuitRequest = 16370u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopConditionFinishNotify = 16372u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CameraSettingQueryRequest = 16381u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssLikeRequest = 16399u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanSetFiveStarSwitchResponse = 16406u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateChangedResponse = 16407u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSailingResponse = 16408u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterBigWorldInstRequest = 16410u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ZitherPlayStateResponse = 16415u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyGridRewardResponse = 16416u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTideMapMarkRequest = 16419u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateInstanceOwnerInfoNotify = 16427u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopLockResponse = 16429u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyAdventurePtRewardResponse = 16430u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityResultRequest = 16437u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GravityFlipInteractRequest = 16440u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBlackboardNotify = 16442u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetYuXueModeInfoResponse = 16446u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingTechLevelUpRequest = 16447u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomLevelUpRequest = 16448u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlyEquipAddNotify = 16449u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SyncPlayerLocationNotify = 16455u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BathPhotoResponse = 16457u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoReChallengeResponse = 16458u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeRewardResponse = 16460u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayFastReturnPosRequest = 16463u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceEntityPosRequest = 16467u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyArtifactSelectResponse = 16473u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateInitRequest = 16475u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HitResponse = 16481u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomPolishResponse = 16484u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerResponse = 16485u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomInteractionUnlockNotify = 16490u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConditionGroupStateRequest = 16491u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryItemCollectionResponse = 16494u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CorniceChallengeEndNotify = 16495u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuickHackOpenPush = 16504u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiInformationResponse = 16509u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationUpdateNotify = 16510u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FeiXuePreheatInfoRewardRequest = 16511u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleMotionListNotify = 16513u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerFormationRecommendRequest = 16517u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookLevelUpResponse = 16518u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerSeasonTaskDataUpdateNotify = 16522u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerSeasonTaskDataUpdateRequest = 16526u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewJourneyResponse = 16530u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightLevelUpdateNotify = 16531u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsTaskRewardRequest = 16541u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoShopRewardLockResponse = 16545u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderRemoveBuffByTagsResponse = 16551u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailBindInfoNotify = 16566u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressBuyBonusLvRequest = 16574u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCourseV2RewardRequest = 16575u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsCloseSettleMenuRequest = 16577u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestFinishActionEndRequest = 16583u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlTaskRewardResponse = 16585u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyNextBoardResponse = 16590u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignSkinRewardRequest = 16596u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttachEntityResponse = 16598u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightSelectCollectionResponse = 16600u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoStepUpdateNotify = 16601u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchAcceptInviteResponse = 16611u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeeklyFrameworkInfoRequest = 16625u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SeamlessTeleportVehicleRequest = 16632u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlockPlayerRequest = 16633u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatResponse = 16640u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockSwitchControlBlockRequest = 16642u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstEntityTeleportRequest = 16644u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerRankListRequest = 16651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LobbyListResponse = 16660u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayItemResponse = 16661u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopBuyRequest = 16667u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsRankRequest = 16670u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayGiftResponse = 16671u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustTraceResponse = 16672u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiftPackPreviewRequest = 16675u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushChooseBuffResponse = 16679u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyResultResponse = 16682u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardUnlockResponse = 16683u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneChangeDataLayerNotify = 16684u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsUpdateOddsResponse = 16685u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyAdventureTaskRewardResponse = 16686u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SplineMoveRequest = 16693u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallItemBagDeltaNotify = 16700u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorParkourResultNotify = 16702u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashMsgResponse = 16706u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdatePlayerPassiveSkillRequest = 16711u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneTempFishPointInfoUpdateNotify = 16713u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlockListResponse = 16716u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvoidBlockRoundInfoNotify = 16725u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AtomicProcessAddBuffRequest = 16727u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorInfoRequest = 16731u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingCageInfoRequest = 16732u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlBagOperateRequest = 16736u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseDetectionSkillRequest = 16737u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballFixSpawnFinishNotify = 16738u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanSetPlanStatusRequest = 16741u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFinishActionEndResponse = 16750u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementFinishRequest = 16752u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoFightLevelInfoNotify = 16757u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledShowNotify = 16761u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEntityAttributeUpdateNotify = 16764u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleIllustratedInfoResponse = 16765u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WuWuKujiGachaRequest = 16766u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifyBulletParamsRequest = 16767u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScratchCardActivityInfoResponse = 16768u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomInteractionEquipRequest = 16770u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemDecomposeRequest = 16771u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DestroyBulletNotify = 16776u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallMapMarkInfoNotify = 16779u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowTeleportToPlotPosRequest = 16785u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestReviewInfoResponse = 16788u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoMemoryCollectNotify = 16791u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenMotorRewardResponse = 16795u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanSaveUsePlanResponse = 16798u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerTaskRewardRequest = 16805u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AudioStateUpdateNotify = 16806u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportActivityTrialRoleUpdateNotify = 16807u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityEquipChangeNotify = 16817u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldLevelDownRequest = 16824u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtSetTimerInfoRequest = 16825u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreateBulletRequest = 16833u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestFinishListNotify = 16834u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGarbStartRequest = 16837u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestBranchSelectResponse = 16841u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoMemoryRewardResponse = 16842u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallMapMarkUpdateNotify = 16865u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmResetNotify = 16867u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrRoadUpdateNotify = 16869u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CharacterDeathPush = 16870u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulCorniceMeetingRewardResponse = 16872u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponItemRemoveNotify = 16873u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanSetPlanStatusResponse = 16878u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardInfoUpdateNotify = 16880u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AccessPathConfigRequest = 16883u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerEnterPollutionRequest = 16885u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyBuffS2cResponsePush = 16890u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemSetPosSenderNotify = 16894u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalScoreRewardRequest = 16898u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookEquippedChangeNotify = 16900u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ElevatorStateChangeResponse = 16901u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleShowListUpdateRequest = 16909u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchStartPlayRequest = 16910u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTakeRewardResponse = 16911u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionRelatedEntityInfoNotify = 16914u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LastBigSceneMiniMapInfoRequest = 16921u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingActivityMileStoneNotify = 16931u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveQuestRecallNotify = 16941u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushSelectBuffNotify = 16943u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResetPointEntityNotify = 16945u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayShopBuyRequest = 16947u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeSeasonRewardReceiveRequest = 16953u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MaterialReplaceRequest = 16956u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CoopSpRewardResponse = 16957u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AutoQuestNotify = 16961u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveWorldTeamResponse = 16965u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffEffectResponse = 16967u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeLastInfoResponse = 16971u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffDurationNotify = 16974u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendAllRequest = 16982u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamParkourRewardResponse = 16986u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResInstStartRequest = 16991u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingTeleportToBoatResponse = 16996u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinAllUnLoadResponse = 16998u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFinishListNotify = 17000u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingRewardRequest = 17008u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchingNotify = 17009u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSceneVoiceSwitchNotify = 17013u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTideMapMarkResponse = 17014u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueCurrencyNotify = 17019u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FightDataCheckNotify = 17021u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryPollutionBoxSteadyLimitNotify = 17022u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherSwitchInfoRequest = 17029u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityDynamicInteractResponse = 17030u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeHeadPhotoRequest = 17034u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssPluginPutRequest = 17042u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2ScoreRewardRequest = 17050u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetTraceQuestYuXueModeResponse = 17059u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayTagInitNotify = 17063u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageUpdateResponse = 17070u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageReplyRequest = 17071u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoadCalabashSkinInfoResponse = 17073u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballTeamReviveResponse = 17085u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardDurableEmptyNotify = 17095u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenFullRewardResponse = 17101u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchConfirmNotify = 17104u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCarnivalAwardRequest = 17112u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopSellRequest = 17114u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveCombineRelationNotify = 17117u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorNewCanUnLockNotify = 17127u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessPlayCardRequest = 17130u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapReplaceMarkRequest = 17142u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivateBuffRequest = 17149u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropCatchLevelFinishResponse = 17151u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseChallengeQuitRequest = 17166u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGarbInsertCoinResponse = 17171u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssLikeNotify = 17176u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CircumFluenceTaskRewardRequest = 17180u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportDungeonActionResponse = 17189u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsResultRequest = 17194u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDifficultyUpdateNotify = 17198u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceResponse = 17200u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockBatchCollectRequest = 17206u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestLockInfoNotify = 17210u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageUpdateRequest = 17215u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbUpLevelRoleResponse = 17222u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SkinRewardRequest = 17224u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorChangeOutlookRequest = 17225u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangeReadyRequest = 17228u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBattleInfoRequest = 17230u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemExchangeInfoRequest = 17245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeCheckResponse = 17250u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressDisposableRewardRequest = 17251u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendAllResponse = 17252u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeBossInstStartResponse = 17253u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonEntrustDataResponse = 17258u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleElementChangeResponse = 17259u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AcceptFocusWaitQuestResponse = 17260u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlSettleNotify = 17267u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ZitherPlayStateRequest = 17270u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceRandListResponse = 17275u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddHackingEntityNotify = 17276u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsTaskNotify = 17279u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportFlowNotify = 17285u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSceneGroupDataNotify = 17286u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemGiftUseResponse = 17290u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLifeSupportUpRequest = 17291u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommitBoardSuccessNotify = 17294u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetChapterRewardResponse = 17302u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkTopicSelectRequest = 17303u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DestroyQuestsNotify = 17308u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockPointFinishRequest = 17312u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRoleInstStartRequest = 17317u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopInfoRequest = 17320u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2InfoResponse = 17321u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseDevelopResetResponse = 17328u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmMainLineInfoRequest = 17337u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceModifyRequest = 17345u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTakeRewardRequest = 17354u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerSeasonTaskDataUpdateResponse = 17355u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportDungeonForbidNotify = 17358u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ProgressBarFinishRequest = 17360u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WuWuTaskRewardRequest = 17363u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombineEntitiesResponse = 17364u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleScoreNotify = 17365u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerRenameNotify = 17369u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoopTeleportVolumeActionRequest = 17374u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchActionRequest = 17379u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StartSetQuestFocusNotify = 17380u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopUpdateRequest = 17383u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengePerRoleLevelNotify = 17390u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimelineTraceStartRequest = 17394u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbRoleSkillLevelNotify = 17396u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoEndShopStepRequest = 17398u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreProgressRewardRequest = 17400u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityIsVisibleNotify = 17405u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchInviteRequest = 17409u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiBlackboardsRequest = 17413u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleDevelopConfigRequest = 17421u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDecalTaskRequest = 17422u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabRequest = 17423u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelInfoUpdateNotify = 17425u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorParkourLevelRewardUpdateNotify = 17426u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterInstRequest = 17431u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OpenSystemBoardResultResponse = 17436u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UsePhantomEquipGroupRequest = 17437u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionResetPosPrePerformanceEndRequest = 17446u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkRoleRewardResponse = 17448u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityFlyEquipChangeNotify = 17450u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderRemoveBuffResponse = 17452u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerNetStatePush = 17456u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestTreeInfoRequest = 17462u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SheriffZoneInfoRequest = 17467u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieAdventureTaskRewardRequest = 17476u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupAddResponse = 17478u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueShopBuyRequest = 17480u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionOperationScreenSuccessResponse = 17481u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabStopRequest = 17493u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsStepAdvanceRequest = 17496u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideInfoRequest = 17498u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ElevatorMoveNotify = 17500u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DrownEndTeleportResponse = 17520u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballQuitResponse = 17521u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleNpcShowOverResponse = 17530u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReadDisplayInfoRequest = 17532u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffEffectExecuteResponse = 17533u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuildingBranchResponse = 17534u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssLikeResponse = 17535u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DetectionResponse = 17538u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyStartResponse = 17543u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleLeaveSlotRequest = 17547u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkInfoUpdateResponse = 17549u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinAllUnLoadRequest = 17550u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisItemRequest = 17552u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleActivateSkillResponse = 17555u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueGiveUpGainRequest = 17559u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeCurrencyNotify = 17560u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InterruptSkillInDelayRequest = 17561u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestShowListNotify = 17562u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestBuffUpdateNotify = 17563u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeChooseDataResultResponse = 17572u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopRequest = 17578u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassPaidNotify = 17586u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaughtResponse = 17589u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MainPhantomRecommendResponse = 17594u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingExitResponse = 17597u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerVoiceLanguageResponse = 17604u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSkinUnlockNotify = 17605u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeconstructTrapResponse = 17614u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VfxNpcPatrolFinishRequest = 17617u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GaSwitchCommonEnemyProCampRequest = 17625u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlCoinUpdateNotify = 17630u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCarnivalSwitchRoleRequest = 17631u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationGameplayTagNotify = 17636u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardRoleSkillRequest = 17639u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisFormulaUnlockResponse = 17641u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorTalkScoreResponse = 17643u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWhiteCatLimitedUpdateNotify = 17645u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TurntableCompleteRequest = 17646u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTraceRequest = 17647u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerAoiRangeNotify = 17657u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorSliderResponse = 17663u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifyBulletParamsNotify = 17666u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResElementUpdateNotify = 17669u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisLevelRewardRequest = 17671u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightKillRequest = 17673u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PressGameNotify = 17678u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillLevelUpViewResponse = 17683u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisLevelUpdateNotify = 17684u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddPlacementNotify = 17686u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveSummonEntityResponse = 17688u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballRoleLevelUpRequest = 17691u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerLevelPlayNotify = 17693u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetFormationDataRequest = 17698u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseAuxiliaryResetRequest = 17701u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendRecentlyTeamUpdateNotify = 17712u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinWearResponse = 17717u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoWeaponUpdateNotify = 17722u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FoundationResponse = 17723u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerCreateXboxSessionResponse = 17732u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDiscardCardResponse = 17740u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PartComponentInitRequest = 17744u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeTaskInfoUpdateNotify = 17747u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookCreatePresetResponse = 17753u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldLevelDiffResponse = 17755u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingInfoRequest = 17766u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityRemoveNotify = 17769u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThemePersonalScoreResponse = 17773u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttributeChangedRequest = 17782u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InputSettingRequest = 17784u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CameraSettingModifyResponse = 17786u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MontagePlayNotify = 17788u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledThrowRequest = 17791u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaughtNotify = 17797u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialResultRequest = 17805u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderRemoveBuffNotify = 17807u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityOnLandedResponse = 17811u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingTechInfoUpdateNotify = 17814u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingSettleRequest = 17839u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayStateNotify = 17840u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaptureBatchEntityRequest = 17846u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceScoreRewardRequest = 17847u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomItemAddNotify = 17848u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendApplyReceivedNotify = 17851u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTideBagSortRequest = 17853u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyAdventurePtRewardRequest = 17854u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponBreachRequest = 17857u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimelineTraceControlRequest = 17862u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CoopRoleRewardResponse = 17866u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdventureManualDataResponse = 17876u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonTargetRewardRequest = 17884u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbFormationAutoAddRoleNotify = 17889u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SystemMarkHideInfoNotify = 17890u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEntityBuffUpdateNotify = 17893u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDiscardCardNotify = 17903u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceSetRequest = 17909u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LongShanScoreRewardRequest = 17915u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GmLevelActionResponse = 17916u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReceiveRechallengeNotify = 17918u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalAreaUnlockNotify = 17922u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulCalabashLevelRewardResponse = 17924u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillBranchModifyResponse = 17930u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddTemporaryTeleportResponse = 17932u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlStartFightNotify = 17934u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemMoveTargetResponse = 17935u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RelationIdNotify = 17936u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CancelMatchResponse = 17942u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantMaxLevelDeliveryItemResponse = 17949u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalUpdateNotify = 17951u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2TreeUpdateNotify = 17953u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RenameFormationResponse = 17954u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleGuideRewardRequest = 17961u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightPlayerDeadResponse = 17964u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NetTestDataNotify = 17969u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HeadIdUpdateNotify = 17973u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldLevelPlayResponse = 17979u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedInfoRequest = 17985u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbUpLevelSkillResponse = 17988u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopUpdateRequest = 17990u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MovePackageNotify = 17992u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MobileButtonSettingUpdateRequest = 17995u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtVarUpdateNotify = 17997u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerScoreRewardRequest = 17999u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerScoreRewardResponse = 18008u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResonantChainOptionalLimitRequest = 18010u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapUnlockFieldNotify = 18018u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueLootChangeRequest = 18020u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportFinishResponse = 18021u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleFinishRequest = 18022u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorAcceptQuestRequest = 18026u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FixToolRequest = 18028u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallInfoNotify = 18029u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingQuickSellPreviewRequest = 18031u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntitySimplyMoveInfoPackagePush = 18037u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleMasterInfoNotify = 18038u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsScoreAwardRequest = 18039u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuildingResetResponse = 18053u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReplaceVehicleEntityNotify = 18061u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestSettleRequest = 18062u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlaceItemOnBoardResponse = 18063u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookingInfoUpdateNotify = 18067u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SignActivityResponse = 18069u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DrownRequest = 18070u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerVoxelEnvRequest = 18071u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateWorldTeamPlayerFightInfoNotify = 18073u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerStartResponse = 18078u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaNewNotify = 18079u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsLegMatchInfoResponse = 18082u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecWorldInfoFlowRequest = 18083u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchDarkTideWeaponSlotNotify = 18091u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulExploreScoreRewardRequest = 18094u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueShopRefreshRequest = 18096u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffEffectExecutePush = 18099u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopComposeRequest = 18102u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldPointRequest = 18106u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsScoreAwardResponse = 18111u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddDecalRequest = 18113u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomCollectReceiveRequest = 18117u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExhibitionItemSaveRequest = 18118u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangePhantomEquipGroupNameRequest = 18119u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleAreaSkillResponse = 18122u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnergySyncResponse = 18125u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RenjuExitMatchedActionResponse = 18128u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillNodeNotify = 18129u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoRoleRecordNotify = 18134u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbOverRoleRequest = 18138u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationResponse = 18151u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallTeleportToMarkIdResponse = 18152u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ZitherPlayNoteNotify = 18156u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSceneDateResponse = 18163u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFocusInfoNotify = 18164u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomIdentifyRequest = 18169u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorBattleContextNotify = 18170u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HardnessModeChangedRequest = 18173u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommitBoardRequest = 18174u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportDungeonActionNotify = 18177u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UiGamePlayResponse = 18181u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTaskUpdateNotify = 18189u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueBlackFlowerNotify = 18190u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OnlineMotorStartNotify = 18191u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddPhantomEquipGroupResponse = 18193u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportTrialRoleLvUpV2Response = 18194u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChannelChatResponse = 18195u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerPsnBlockListRequest = 18200u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoRoleUnlockNotify = 18201u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2TreeFinishCondUpdateNotify = 18202u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityDisableNotify = 18208u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonBuildFlowResponse = 18212u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FoodProcessRequest = 18213u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityVarUpdateNotify = 18216u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionOperationScreenNotify = 18224u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangePhantomEquipGroupNameResponse = 18227u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonIllustratedRequest = 18233u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueBlackFlowerResponse = 18239u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChatResponse = 18241u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecWorldStartFlowRequest = 18243u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleConfigInfoNotify = 18250u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyCurrencyUpdateNotify = 18251u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LstBattleRecordRequest = 18253u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemAttributeChangeNotify = 18254u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTidePoisonCircleDayInitNotify = 18257u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreToolAuthorizationNotify = 18264u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChannelChatHistoryNotify = 18271u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetBaoziStateRequest = 18278u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorUseSkinResponse = 18288u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefencePlayerReviveNotify = 18289u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlockListRequest = 18290u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherNotify = 18291u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlientFirstAwardNotify = 18295u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressTrialRoleLvUpResponse = 18298u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiControlSwitchRequest = 18300u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneGamePlayInfoNotify = 18306u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRewardRequest = 18308u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DrownResponse = 18315u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResLastInstInfoRequest = 18322u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayInfoRequest = 18331u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlRoleUnlockNotify = 18339u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoUpgradeRewardNotify = 18341u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyQuestChangePreferRequest = 18344u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveGameplayEffectNotify = 18345u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityDynamicInteractRequest = 18350u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantStableValueActivityRequest = 18354u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityStaticHookMoveRequest = 18356u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResMoodUpdateNotify = 18361u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSelectReserveCardResponse = 18367u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbGetRoleListNotify = 18368u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SummonRandomRequest = 18382u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemGiftUseRequest = 18386u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTalentSkillLevelRequest = 18391u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoopTeleportVolumeActionResponse = 18393u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonBuildFlowRequest = 18395u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakFinishResponse = 18398u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCarnivalSwitchRoleResponse = 18412u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSceneFishCageInfoUpdateNotify = 18416u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestNpcMoveOverResponse = 18418u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalAtmosphereRewardRequest = 18419u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyRewardNotify = 18421u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QueryOnlinePlayersAreaRequest = 18422u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabResponse = 18423u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleEvolveRequest = 18425u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashExpAddNotify = 18431u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledResponse = 18432u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingActivityLimitRewardResponse = 18435u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchLogicStateRequest = 18438u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeamReceiveNotify = 18439u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailDeleteRequest = 18443u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScheduleRewardRequest = 18448u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetYuXueModeInfoRequest = 18449u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InputSettingUpdateNotify = 18450u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueUpdateReviveTimesNotify = 18452u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsStepAdvanceResponse = 18453u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PsnSettingUpdateResponse = 18454u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueGotoNextRoomCommitResponse = 18455u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantItemUnlockNotify = 18458u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingIllustratedInfoUpdateNotify = 18459u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReadCardRequest = 18462u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonActivityRewardResponse = 18470u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedUnlockResponse = 18471u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTidePickUpItemResponse = 18475u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestBuffUnlockNotify = 18477u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ForgeFormulaUnlockResponse = 18480u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CameraSettingModifyRequest = 18483u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessTaskTakeResponse = 18488u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRefreshNextWaveGroupRequest = 18493u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRoundInfoNotify = 18494u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GravityHookLockPointChangeGravityRequest = 18495u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchConfirmResponse = 18498u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWhiteCatLimitedRewardRequest = 18506u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReorderFormationRequest = 18507u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightScoreNotify = 18508u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinChangeNotify = 18513u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleReconstructCardResponse = 18514u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSlotUpdateResponse = 18521u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HandInInfoUpdateNotify = 18524u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoLimitTaskReceiveResponse = 18530u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomEquipGroupInfosRequest = 18533u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueLootChangeNotify = 18535u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStorySellItemResponse = 18536u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerGuideActivityInfoResponse = 18537u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayFastReturnPosResponse = 18541u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmTaskOneKeyRewardResponse = 18542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DrownPush = 18544u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecFBRoundStartFlowResponse = 18546u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShowInvalidItemResponse = 18549u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceInfoUpdateNotify = 18554u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnrichmentAreaResponse = 18556u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JoinSceneNotify = 18559u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponAddNotify = 18560u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ToughCalcExtraRatioChangeResponse = 18566u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ValidTimeItemRemoveNotify = 18573u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityRecommendNotify = 18576u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockSplitClientLoginPush = 18577u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdatePlayerSingleFightRoleNotify = 18580u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherControlInfoRequest = 18581u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerResetResponse = 18583u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueResultResponse = 18585u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterViewDirectionRequest = 18587u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MaterialRequest = 18588u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonIllustratedNotify = 18595u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestRedDotResponse = 18604u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ForgeItemInfoUpdateNotify = 18614u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QueryOnlinePlayersAreaResponse = 18627u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseUseItemRequest = 18631u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportNotify = 18633u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoSettlementRequest = 18635u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateFormationRequest = 18636u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyBuffS2cRequestNotify = 18641u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkRequest = 18642u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityInteractRequest = 18643u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReviveRequest = 18644u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTideMapMarkUpdateNotify = 18648u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneGroupDataAndCurFormationEntityRequest = 18649u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VisionExploreSkillSetResponse = 18650u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScratchCardRewardResponse = 18651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PilotThrowOperationResponse = 18656u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSkillBaitResponse = 18662u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomInteractionInfoUpdateNotify = 18664u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerTitleResponse = 18669u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseAuxiliaryLevelUpResponse = 18673u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityWalkingPatternFinishResponse = 18680u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBuffProducerRequest = 18682u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaptureBatchEntityResponse = 18685u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorLockedTechUpdateNotify = 18686u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateFightRoleResponse = 18693u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaInfoResponse = 18695u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SummonResponse = 18705u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PortalReplaceNotify = 18706u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThroughTrainFinishViewRequest = 18707u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockPointExitResponse = 18710u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerSaveRecordResponse = 18715u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantItemAccessProgressChangeNotify = 18717u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TetrisFinishRequest = 18718u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveTotalScoreNotify = 18727u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoItemUnlockNotify = 18731u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecWorldSEndFlowResponse = 18732u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerSeasonUpdateResponse = 18739u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBuffTriggerInfoNotify = 18740u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceMoonPhaseRewardResponse = 18742u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoraleInfoNotify = 18749u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerRewardResponse = 18751u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportFlowEndResponse = 18758u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueChooseDataResultResponse = 18760u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmBlackboardNotify = 18761u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTrialRoleInfoRequest = 18768u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightSelectBuffGateRequest = 18769u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendRecentlyTeamResponse = 18777u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSexChangeResponse = 18787u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoItemUpdateNotify = 18788u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsTaskRewardResponse = 18798u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PreAiControlSwitchNotify = 18803u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmRankListSelfDataRequest = 18805u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstSettleNotify = 18806u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoveSplineStatusNotify = 18808u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchOperResponse = 18810u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayRefreshShopResponse = 18811u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockPointRequest = 18814u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomEquipGroupInfoNotify = 18815u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillQuickLevelUpResponse = 18822u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookFullRewardRequest = 18824u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakTimeResponse = 18825u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerMotionRequest = 18827u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorLinkTaskRequest = 18830u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LineCrossChallengeStartRequest = 18834u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialResultNotify = 18837u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillLevelUpViewRequest = 18841u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveSummonEntityRequest = 18845u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityPayShopBuyResponse = 18847u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleResponse = 18852u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreatureDetailResponse = 18855u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleReconstructCardNotify = 18858u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PolluteGridCellRequest = 18862u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDeployNotify = 18865u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveActivityInfoRequest = 18867u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetMatchTeamMatchFlagRequest = 18868u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmStateBehaviorResponse = 18875u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FollowerChairPresentationPush = 18876u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetBtObjYuXueModeRequest = 18881u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkRoleInviteRequest = 18883u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonIllustratedResponse = 18884u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeResultNotify = 18887u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreProgressRewardIdsNotify = 18889u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayGainRewardInfoNotify = 18892u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateNodeStatusNotify = 18896u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdatePlayersFightRolesInfoNotify = 18899u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomUnlockNotify = 18900u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyBlackFlowerRequest = 18903u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageChatCharmChangeResponse = 18908u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerFormationRecommendResponse = 18909u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchAnimationResponse = 18911u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallInstSaveDataNotify = 18912u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemLockResponse = 18915u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChatMutePlayerListNotify = 18916u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestActionRequest = 18918u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelFullRewardResponse = 18919u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinUpdateNotify = 18921u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TargetGearHitResponse = 18922u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGarbStartResponse = 18927u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OnlineMotorUpdateNotify = 18930u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeamCastHitPlayerResponse = 18932u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCheckCardSkillUnlockResponse = 18934u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsLockRequest = 18939u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportDataResponse = 18941u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuyShopProductResponse = 18945u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyCurrencyNotify = 18949u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingPointInfoResponse = 18952u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageReceivedResponse = 18956u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResChangeFormationResponse = 18969u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeSceneRoadNotify = 18972u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashMsgNotify = 18974u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymReadResponse = 18978u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceSettingNotify = 18981u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerGuideActivityRewardResponse = 18982u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsWeaponInfoResponse = 18985u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InputSettingResponse = 18992u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleQuestAcceptRequest = 18997u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoChestRewardSelectRequest = 19001u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelTaskRewardRequest = 19004u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoWeaponUnlockNotify = 19005u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlFightOverResponse = 19008u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KickWorldTeamResponse = 19020u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBdUpdateNotify = 19038u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffItemNotify = 19044u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerAccessRangeNotify = 19051u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetDetectionTargetResponse = 19055u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaResponse = 19056u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlStartFightRequest = 19061u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OperationRestrictionNotify = 19069u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmConditionPassPush = 19070u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsGearRefundRequest = 19077u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseChallengeResultNotify = 19080u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmRankListSelfDataResponse = 19090u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrFireAddNotify = 19099u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldBlackboardRequest = 19106u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeSubLevelNotify = 19107u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatMaxCaseMessageResponse = 19109u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRankListSelfDataRequest = 19112u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResSwitchFormationResponse = 19117u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightTalentUpResponse = 19118u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBvBSettleNotify = 19121u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ValidTimeItemUpdateNotify = 19123u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuildingResetRequest = 19127u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeeklyFrameworkInfoResponse = 19130u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FurnitureUnlockNotify = 19142u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardRewardInfoUpdateNotify = 19146u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicSaveResponse = 19149u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchCharacterStatePush = 19156u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFastReturnPosRequest = 19158u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveBuffByIdS2cResponsePush = 19162u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCallCardResponse = 19169u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyGotoNextRoomRequest = 19170u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LineCrossActivityUpdateNotify = 19172u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestReadyForGiveUpResponse = 19174u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamParkourRewardRequest = 19176u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookInfoUpdateNotify = 19177u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerHandFoundationCoreChangeNotify = 19181u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayCuePush = 19183u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinWearAllRoleRequest = 19185u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageChatThemeChangeResponse = 19186u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherControlRequest = 19192u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TemporaryTeleportChangeNotify = 19202u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttributeInitNotify = 19205u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthDayInfoNotify = 19209u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageUpdateNotify = 19211u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityRemoveDynamicInteractNotify = 19212u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SingleInstRechallengeRequest = 19217u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomAutoPutResponse = 19223u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveMatchTeamNotify = 19226u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityGravityUpdateNotify = 19228u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayStateRequest = 19230u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrManualCancelTraceRoadRequest = 19233u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BoneVisibleChangePush = 19234u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerEnterWorldTeamNotify = 19236u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreProgressRequest = 19237u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CircumFluenceTaskRewardResponse = 19238u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmCustomBlackboardNotify = 19239u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicInfoRequest = 19247u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingCabinPutResponse = 19250u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerHeadUpdateNotify = 19263u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleUpdateDevelopTargetResponse = 19264u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SeamlessTeleportResponse = 19267u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuyShopProductRequest = 19270u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InteractiveUpdateRequest = 19271u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayGmInfoUpdateNotify = 19286u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeInstNotify = 19288u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseAuxiliaryBranchRequest = 19295u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemovePreloadFlowsNotify = 19296u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingShipFixRequest = 19300u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoLevelDataUpdateNotify = 19312u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerAccessRangeResponse = 19314u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DressPlayerTitleUpdateNotify = 19326u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeUpdateNotify = 19331u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThroughTrainForceRemindNotify = 19334u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchRequest = 19337u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthdayShowSetResponse = 19338u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VisionTriggerPush = 19341u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassPortalResponse = 19351u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterInstResponse = 19352u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConnectorCanConnectRequest = 19355u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ServerConfigVersionInfoNotify = 19359u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballTaskRewardRequest = 19362u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssReviveTimeNotify = 19368u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveInstanceTimerResponse = 19370u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyTaskUpdateNotify = 19371u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropCatchLevelRewardResponse = 19373u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceRandListRequest = 19374u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupAddRequest = 19376u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryMascotRewardRequest = 19377u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballSettleNotify = 19382u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssSelfPassRequest = 19384u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrialRoleSkinRewardRequest = 19389u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoadingLevelAreaResponse = 19391u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSkillBaitRequest = 19403u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerResetRequest = 19406u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceRecallQuestNotify = 19408u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattlePhantomCardSkillRequest = 19409u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RbBlockStateChangeNotify = 19426u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingLevelInfoUpdateNotify = 19428u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StopMoveSplineResponse = 19432u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExitViewDirectionPush = 19441u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockCardNotify = 19442u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseRefreshGainingGroupResponse = 19444u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssPluginSynthesisResponse = 19445u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    Summon2Request = 19448u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneModeChangeFinishRequest = 19453u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballInGameSyncPayloadResponse = 19461u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatDataResponse = 19466u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorParkourLevelRewardResponse = 19468u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatSendPackRequest = 19470u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockGamePlayReadyResponse = 19471u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetAdventureRewardResponse = 19480u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MainPhantomRecommendRequest = 19481u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveBuffByIdS2cRequestNotify = 19482u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResRoleBondUpdateNotify = 19491u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtCancelRangeFailWarningNotify = 19492u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlaySwitchSportModeRequest = 19509u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityDressOrnamentChangeNotify = 19511u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamParkourTaskNotify = 19512u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TreasureChestCountIncrementNotify = 19516u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreatureDetailRequest = 19517u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyBoardRewardResponse = 19522u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeOrnamentResponse = 19523u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnergyUpdateNotify = 19527u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveTemporaryTeleportNotify = 19531u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SummonRandomResponse = 19533u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsSettleNotify = 19536u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpecialItemEquipResponse = 19540u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymUnlockNotify = 19541u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayEventChoiceResponse = 19545u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabPauseStartRequest = 19546u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoDieNotify = 19556u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeRoomInfoNotify = 19560u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityCommonTagNotify = 19566u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceDeleteRequest = 19569u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaAccumulateInfoNotify = 19571u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemSetPosSenderRequest = 19577u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomReturnRequest = 19584u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PsnSettingUpdateRequest = 19585u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceCreateResponse = 19595u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockCloseGamePlayNotify = 19604u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockChangePush = 19606u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestReadyForGiveUpRequest = 19607u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisInfoUpdateNotify = 19611u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifySignatureResponse = 19625u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DetectionPreOpenNotify = 19627u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetAlertUiVisibleResponse = 19633u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerBasicInfoGetRequest = 19634u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemStateResponse = 19635u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerSaveRecordRequest = 19636u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombineEntitiesRequest = 19641u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockExitGamePlayResponse = 19646u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TestSpawnTemplateEntityPush = 19647u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiControlSwitchResponse = 19656u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleStateChangeRequest = 19661u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashDevelopRewardUnlockNotify = 19666u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopInfoNotify = 19667u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsWeaponInfoRequest = 19675u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AtomicProcessAddBuffResponse = 19678u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTidePoisonCircleStopShrinkNotify = 19681u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTideDiscardItemResponse = 19686u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResInstResultRequest = 19690u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerFunctionPreUnlockRequest = 19702u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AgreeJoinResultResponse = 19703u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetBaoziStateResponse = 19707u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseGetSpecialRewardResponse = 19710u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomVicePolishRequest = 19711u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrialRoleSkinRewardResponse = 19716u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestNpcMoveOverResponse = 19722u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorListNotify = 19733u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyOptionSelectResponse = 19745u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GravityFlipUpdateTypeNotify = 19748u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendApplySendResponse = 19754u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameStatsShowResponse = 19755u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemovePlacementFromBoardNotify = 19759u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SplineMoveNotify = 19766u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChannelChatRequest = 19772u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamChallengeResponse = 19774u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponAllInfoNotify = 19780u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RolePropResponse = 19787u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassEnterPush = 19788u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayInfoNotify = 19789u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OutputDebugInfoNotify = 19792u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CountryExploreScoreInfoResponse = 19799u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MessageDecodeFailNotify = 19803u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaAccumulateRewardResponse = 19810u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InitRangeResponse = 19814u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitNodeRequest = 19815u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffStackCountRequest = 19820u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryResidentTaskRewardResponse = 19821u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeGotoNextRoomRequest = 19829u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockBatchCollectResponse = 19834u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeekCardInfoResponse = 19836u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestReadyForGiveUpRequest = 19845u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFastReturnPosResponse = 19847u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleLevelUpViewRequest = 19849u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveReviveRegionResponse = 19851u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    H5ViewActivityReadResponse = 19853u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikePopularEntriesChangeRequest = 19865u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayNextDayResponse = 19866u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LineCrossChallengeStartResponse = 19877u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayTributeResponse = 19879u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseMonsterConsecutiveKillsNotify = 19882u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveGameplayEffectRequest = 19884u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyAdventureTaskUpdateNotify = 19886u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchLogicStateNotify = 19887u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsGainDataUpdateNotify = 19888u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueInfoNotify = 19891u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerMedalInfoRequest = 19895u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardSkillResponse = 19901u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaughtPush = 19906u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueChooseDataResultRequest = 19909u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTalentUnlockRequest = 19911u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VfxNpcPatrolFinishResponse = 19912u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivateBuffResponse = 19917u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTakeAllRewardRequest = 19919u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockInstEntranceRequest = 19928u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InviteRechallengeNotify = 19929u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialSelectBossNotify = 19931u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetFanStateRequest = 19934u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardUpdateNotify = 19936u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressQuestionOpenResponse = 19944u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ButtonIsEnableResponse = 19953u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardTargetInfoRequest = 19967u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryMascotInfoUpdateNotify = 19969u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetLevelPlayRewardsRequest = 19971u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicUnlockResponse = 19978u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopPush = 19986u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoStepAdvanceRequest = 19987u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatValDecayBeginNotify = 19990u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoReChallengeCountNotify = 19995u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchThreeStarResponse = 19999u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueLootInfoResponse = 20010u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoStepAdvanceResponse = 20011u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TreasureBoxSlotAllInfoNotify = 20020u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveBuffS2cRequestNotify = 20022u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessTakeResponse = 20024u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetNpcPerformStateNotify = 20027u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueLootChangeResponse = 20028u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinUnLoadRequest = 20032u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerNetStateNotify = 20034u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueRefreshGainRequest = 20036u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SignActivityKeepTimeNotify = 20038u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponSkinUnLoadNotify = 20040u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTaskRewardTakeResponse = 20042u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneLoadingFinishRequest = 20048u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangePlayerUiStateNotify = 20049u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoraleTreasureBoxTraceResponse = 20050u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkRoleRewardRequest = 20051u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResInstOptionsNotify = 20056u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupUpdateRequest = 20057u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationSwitchCurrentRequest = 20059u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendRemarkResponse = 20061u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingQuickSellPreviewResponse = 20069u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayStateListResponse = 20073u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DrownEndTeleportPush = 20074u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFinishActionEndRequest = 20075u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityRemoveBubbleNotify = 20077u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyInteractionResultNotify = 20079u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntitySendEventRequest = 20081u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldLevelPlayRepeatedRequest = 20085u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmMontageDurationNotify = 20087u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailFavoriteRequest = 20098u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayCueRequest = 20103u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapCustomMarkUpdateNotify = 20105u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlTaskRewardRequest = 20110u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RobotDestinationNotify = 20116u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakFinishRequest = 20117u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedUnlockRequest = 20120u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RenjuResetRequest = 20123u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BoneVisibleChangeRequest = 20124u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExecuteQteNotify = 20131u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyTaskRemoveNotify = 20133u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientBasicInfoRequest = 20137u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstTeleportToResetPointRequest = 20140u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlEventSelectRequest = 20144u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RunTestRequest = 20152u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerPsnInfoGetRequest = 20153u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SkillNotify = 20156u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreateBulletResponse = 20162u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeRequest = 20163u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushClaimRewardResponse = 20167u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestInstUpdateNotify = 20169u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightSelectBuffGateResponse = 20172u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetLevelPlayRewardsResponse = 20173u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueShopInfoUpdateNotify = 20174u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LifePointChallengeStartRequest = 20181u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillAddResponse = 20187u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityDailyTaskInfoNotify = 20204u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoLevelRecordDeleteRequest = 20207u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientCurrentRoleReportPush = 20213u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationGameplayTagPush = 20216u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CertificateLevelRewardResponse = 20218u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerUpdateNotify = 20220u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneGamePlayStatusNotify = 20225u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExitViewDirectionResponse = 20227u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerRewardResponse = 20230u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeScheduleTriggerNotify = 20242u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StartRecallRequest = 20244u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthDayRewardRequest = 20245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SunSpiritActionOperationEndPush = 20253u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayRefreshGachaRequest = 20257u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeUnlockResponse = 20260u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheatInputResponse = 20265u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopDirectBuyResponse = 20285u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldLevelRegainRequest = 20287u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemSequenceFrameEndResponse = 20290u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportToTargetRequest = 20294u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RobotDestinationPush = 20295u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerRecommendRequest = 20297u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillViewResponse = 20300u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemMoveTargetRequest = 20302u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryItemCollectionInfoUpdateNotify = 20304u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoNextWaveTypeNotify = 20306u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonBuildingDataResponse = 20309u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantDeliveryItemResponse = 20317u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerFloorUpdateNotify = 20319u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlSettleRequest = 20328u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatSendPackResponse = 20332u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BoneVisibleChangeResponse = 20334u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AgreeJoinResultNotify = 20337u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveGameplayEffectPush = 20358u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageReplyResponse = 20362u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkInfoUpdateRequest = 20363u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyQuestCancelNotify = 20367u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommonTouchUiSettingUpdateRequest = 20368u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerRoleVoiceSetRequest = 20371u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerResetRequest = 20373u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SignatureUpdateNotify = 20375u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestBranchSelectRequest = 20377u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtForcedOccupationResponse = 20380u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TopPhantomEquipGroupRequest = 20387u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryDiscardItemRequest = 20391u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailDeleteResponse = 20393u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockHeadFrameNotify = 20396u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestReadyForGiveUpResponse = 20397u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateChildQuestNodeStatusNotify = 20398u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleScoreEnableNotify = 20406u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RenjuExitMatchedActionRequest = 20413u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TriggerExitSkillPush = 20414u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterAoiNotify = 20418u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookFormulaRequest = 20428u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnableDamageRecordResponse = 20429u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyGridRewardRequest = 20431u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeHeadPhotoResponse = 20433u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayTagPush = 20435u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardTargetInfoResponse = 20438u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExchangeRewardInfoNotify = 20442u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockResetGamePlayRequest = 20443u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTaskRequest = 20446u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ValidTimeItemResponse = 20447u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerRoundUpdateNotify = 20449u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsChallengeInfoUpdateNotify = 20450u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChapterResultRewardRequest = 20453u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTideItemMarkUpdateNotify = 20455u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerSkillInfoPbNotify = 20458u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueGainGetOrLoseNotify = 20460u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResGridEventRequest = 20462u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StorageInfoResponse = 20464u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangeRoleResponse = 20466u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinTrialSettleNotify = 20469u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FunPlayChallengeSettleNotify = 20471u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeCheckNotify = 20474u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRefreshCollectionTimesChangeNotify = 20476u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailBindResponse = 20479u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActorVisibleRequest = 20487u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerDailyTaskRewardResponse = 20492u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateChangedPush = 20495u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SkillResponse = 20499u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryBagOperateRequest = 20504u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardPosChangeNotify = 20505u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueResultRequest = 20506u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LogicStateInitPush = 20507u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopInstPush = 20510u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballStartNotify = 20511u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StartMatchResponse = 20517u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionErrorCodeNotify = 20519u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCarnivalTaskJumpUpdateNotify = 20522u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSellPreviewRequest = 20524u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSkillNotify = 20528u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleGiftRewardResponse = 20539u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingActivityMilestoneRewardRequest = 20542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeGotoNextRoomRequest = 20543u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoUpgradeRewardSelectRequest = 20545u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsTalentUnlockNotify = 20550u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballTaskRewardResponse = 20552u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldLevelPlayRepeatedResponse = 20555u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyOptionSelectRequest = 20557u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UiGamePlayRequest = 20564u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalCollectStateNotify = 20565u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemExchangeInfoResponse = 20569u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtGiveUpRequest = 20571u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashSkinTakeOnRequest = 20574u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingShipFixResponse = 20583u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrArchiveTaskRewardResponse = 20584u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerRoleEnergyResponse = 20585u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateInstanceTimerNotify = 20590u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillRemoveResponse = 20593u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueBlessGroupSelectResponse = 20594u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatMessagePostInfoResponse = 20596u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulAchievementReceiveRequest = 20609u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockGamePlayReadyRequest = 20611u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityPreOpenRequest = 20615u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeSettleNotify = 20618u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLockItemRequest = 20634u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorSummonAndRideNotify = 20643u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OccupyRewardRequest = 20644u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoLimitTaskUpdateNotify = 20647u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleChallengeInfoUpdateNotify = 20648u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DrownEndTeleportRequest = 20649u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityRandomInteractResponse = 20654u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScenePlayerOfflineNotify = 20659u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtRollbackInfoNotify = 20660u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NormalItemUpdateNotify = 20661u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieAdventureTaskRewardResponse = 20663u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightEnterSubLevelResponse = 20665u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryScoreRewardRequest = 20667u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryPollutionUpdateNotify = 20668u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoonPhaseRewardResponse = 20673u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomInteractionSkinChangeResponse = 20674u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopAnimResponse = 20676u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuildingUnLockRequest = 20679u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GatherActivityRewardResponse = 20681u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MaterialReplaceResponse = 20685u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeCardRequest = 20690u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakResponse = 20692u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoFightSettleResponse = 20695u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleChangePassengerResponse = 20697u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    XboxSettingUpdateRequest = 20700u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonTokenCoinNotify = 20701u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyerEnterSceneNotify = 20705u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffEffectPush = 20706u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleElementChangeRequest = 20709u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmSetRedDotRequest = 20712u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2LevelUpRequest = 20713u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationGameplayTagResponse = 20718u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorUnLockResponse = 20728u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifyNameRequest = 20729u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestBuffCountRewardResponse = 20737u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFlyEquipChangeNotify = 20739u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSelectReserveCardRequest = 20746u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DiscardWeaponPush = 20752u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressDisposableRewardResponse = 20754u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopInfoRequest = 20758u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtForcedOccupationRequest = 20760u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopSellResponse = 20763u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSceneItemBlackboardRequest = 20774u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionOperationScreenSuccessRequest = 20776u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerAttrNotify = 20778u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlInstBaseNotify = 20779u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkCoastInfoResponse = 20782u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardRewardResponse = 20785u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerShowNameResponse = 20786u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchRoleRequest = 20789u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestStatusUpdateNotify = 20791u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieAdventureChapterDropResponse = 20800u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WuWuPackageRewardResponse = 20803u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessCountUpdateNotify = 20808u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerSeasonRewardRequest = 20810u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeStateConfirmNotify = 20811u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DebugDrawPosNotify = 20812u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmTaskUpdateNotify = 20813u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackSwordChallengeMarkItemPanelInfoResponse = 20814u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonthCardDailyRewardNotify = 20826u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterMatchInstResponse = 20833u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkShowIdInfoUpdateNotify = 20835u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerLastCycleInfoResponse = 20840u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaAccumulateInfoResponse = 20853u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MutiplayerTeamRefreshNearListResponse = 20855u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GivebackInfoUpdateNotify = 20857u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessDrawCardResponse = 20858u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueGiveUpGainResponse = 20859u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSelectGainingGroupResponse = 20864u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleMotionFinishConditionNotify = 20870u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorLinkTaskResponse = 20877u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiInformationPush = 20879u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerRewardRequest = 20887u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BatchSynthesisItemResponse = 20888u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OpenSystemBoardResultRequest = 20900u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResOpDoneResponse = 20903u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DirectTrainInfoUpdateNotify = 20905u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerRequest = 20908u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSettingUpdateResponse = 20909u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallExploreSkillRouletteSetRequest = 20923u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueBlessGroupSelectRequest = 20925u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivateBuffPush = 20926u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdatePlayerPassiveSkillResponse = 20928u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDebugInfoResponse = 20930u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleTaskRewardResponse = 20933u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorcycleTaskUpdateNotify = 20935u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InvestRequest = 20937u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryItemCollectionRequest = 20939u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseQuickEquipRequest = 20940u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResRoomInfoNotify = 20943u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchConfirmRequest = 20944u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PilotThrowOperationRequest = 20946u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRoomInfoNotify = 20950u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleActivateSkillRequest = 20952u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTideDiscardItemRequest = 20955u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulRoguelikeWriteCatRewardResponse = 20956u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedReadResponse = 20958u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangePlayerUiStateResponse = 20959u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemRelateFoundationNotify = 20976u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerHeadResponse = 20990u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResetBabelTowerLevelRequest = 20991u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropCatchLevelRewardRequest = 20994u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstTeleportToResetPointResponse = 20995u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerSeasonUpdateRequest = 20997u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SheriffAnomalyInfoUpdateNotify = 20999u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GivebackUnlockNotify = 21002u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSkillRequest = 21005u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemUseResponse = 21012u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyRechallengeRequest = 21016u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollSmallMapInfoRequest = 21017u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestBuffUnlockRewardResponse = 21018u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowSeqSetPlayerPosRequest = 21021u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightPlayerDeadRequest = 21022u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayShopBuyResponse = 21023u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchSettleDataResponse = 21024u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkInfoResponse = 21025u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttributeChangedResponse = 21027u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowerPollutionRequest = 21028u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlStartFightResponse = 21032u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBurnBuffNotify = 21033u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomIdentifyResponse = 21034u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTalentLevelUpResponse = 21035u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeWeatherResponse = 21042u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoveSceneItemPush = 21046u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifySignatureRequest = 21047u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdatePlayerAllFightRoleNotify = 21051u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchRoundRequest = 21053u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrArchiveReadRequest = 21062u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeforeHitPush = 21067u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SingleInstRechallengeResponse = 21069u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopBuyNotify = 21076u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementUpdateResponse = 21082u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceRankShowNameResponse = 21093u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsSpawnMonsterWaveEndNotify = 21097u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifyBulletParamsResponse = 21100u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleBreakThroughViewResponse = 21102u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerMotionResponse = 21104u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrManualCancelTraceRoadResponse = 21107u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieAdventureChapterDropRequest = 21108u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessDrawCardRequest = 21109u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeSummonEntityStateResponse = 21132u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrFireNoticeRequest = 21139u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatMessagePrefixInfoRequest = 21140u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerRankListResponse = 21141u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HitEndPush = 21148u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowActionRequest = 21156u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTalentInfoRequest = 21173u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushBuffChooseResultResponse = 21177u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeChooseDataRequest = 21182u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetQuestFocusModeResponse = 21189u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FirecrackerEntityCreatedNotify = 21194u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBdGroupUnlockNotify = 21201u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmSettleResponse = 21204u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonEntrustDataRequest = 21209u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterDrownRequest = 21217u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsNormalAwardResponse = 21229u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimePointActivityRewardRequest = 21232u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportFlowEndRequest = 21234u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryBagOperateResponse = 21239u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialGiveUpTempArchiveRequest = 21241u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldPointResponse = 21245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeWriteCatBossRewardResponse = 21248u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAddBubbleNotify = 21249u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingSettleNotify = 21250u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayCueResponse = 21252u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryAreaSecretRewardRequest = 21261u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackSwordChallengeInfoRequest = 21267u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyRoomInfoNotify = 21270u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisInfoRequest = 21275u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockOpenGamePlayNotify = 21277u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopUnlockNotify = 21280u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    XboxSettingRequest = 21284u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GatewayEchoResponse = 21290u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeResultRequest = 21292u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueArchiveListResponse = 21294u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2InfoRequest = 21305u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeChooseDataResponse = 21308u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GravityGearRequest = 21311u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyRewardRequest = 21313u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VisionTriggerNotify = 21314u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTideItemMarkRequest = 21315u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchOutResponse = 21325u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeUnlockRequest = 21327u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceScoreRewardResponse = 21331u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueBossLinkSettleNotify = 21333u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowShowEntityNotify = 21334u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConstructTrapRequest = 21336u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRankListRequest = 21341u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReadDisplayInfoResponse = 21345u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ValidTimeItemAddNotify = 21350u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerSelfPassResponse = 21358u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponSkinAddNotify = 21360u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ForgeFormulaUnlockRequest = 21366u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeStateNotify = 21371u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AreaTerminalPinOperationResponse = 21372u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StorageInfoUpdateRequest = 21380u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomReturnResponse = 21387u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResInstResultResponse = 21394u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerSelfPassRequest = 21395u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConnectorConnectEntityNotify = 21398u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCourseV2RewardResponse = 21399u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressTaskRequest = 21404u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsoleNotify = 21407u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestActionRequest = 21411u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleChangePassengerRequest = 21416u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoUpgradeRewardSelectResponse = 21419u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueInsListResponse = 21420u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetInstExchangeRewardResponse = 21421u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestScoreRewardRequest = 21426u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomEquipGroupInfosResponse = 21429u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlockPlayerResponse = 21431u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLimitTaskInfoUpdateNotify = 21435u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchRoleNotify = 21436u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRoleRewardResponse = 21447u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageReadResponse = 21455u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RunTestResponse = 21458u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowServerSkipNotify = 21461u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleGoDownPush = 21463u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapOpenPush = 21465u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseQuickEquipResponse = 21470u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneGamePlayOpenTimeNotify = 21473u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FoundationCoreOperateResponse = 21475u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EncircleChallengeStartRequest = 21480u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SquadPropChangedNotify = 21485u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConnectorConnectEntityResponse = 21486u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeResetNotify = 21493u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomVicePolishAckRequest = 21501u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QingXiaoTaskUpdateNotify = 21503u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDiscardCardRequest = 21509u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConditionGroupStateResponse = 21511u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyQuestGetRewardResponse = 21514u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstTimeoutNotify = 21516u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSkillTeleportResponse = 21518u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingCompleteResponse = 21524u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropInBagNotify = 21527u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseGetRewardRequest = 21539u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassLevelUpResponse = 21544u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeRewardRequest = 21551u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropCatchInfoRequest = 21559u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterMatchInstRequest = 21561u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballInGameSyncPayloadRequest = 21563u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueShopUpdateNotify = 21564u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayRewardResponse = 21572u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkInfoRequest = 21577u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerTitleRequest = 21582u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookCreatePresetRequest = 21586u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveInstResponse = 21587u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBoardSettleNotify = 21589u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceSelfPassRequest = 21596u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalDieRequest = 21599u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PressRequest = 21606u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FurnitureDiySaveRequest = 21612u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimelineTraceStartResponse = 21613u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommonTouchUiSettingUpdateResponse = 21615u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SelectBabelActivityDeTermResponse = 21621u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DissolveCombineRelationRequest = 21623u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeekCardRewardResponse = 21630u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatClearNotify = 21637u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchFirstEnterResponse = 21638u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryAreaInfoUpdateNotify = 21643u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoSettlementResponse = 21645u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockMultiMapNotify = 21647u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DragonPoolConfRequest = 21659u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffStackCountPush = 21666u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ServerCommandNotify = 21667u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonSettleResponse = 21671u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorChangeOutlookResponse = 21672u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRewardsUpdateNotify = 21674u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTaskResponse = 21675u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardRoleTargetInfoRequest = 21677u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleStartRequest = 21680u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehiclePassengerUpdateNotify = 21681u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerXboxInfoGetRequest = 21683u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassExpUpdateNotify = 21684u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SilenceNpcNotify = 21690u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionGroupCreateNotify = 21691u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddChapterResultRequest = 21695u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangePlayerTitleResponse = 21696u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardRewardRequest = 21697u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiHateNotify = 21698u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBvBLoadingFinishRequest = 21700u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRankListResponse = 21709u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MovePlacementRequest = 21717u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssPluginItemRemoveNotify = 21718u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoSellWeaponResponse = 21719u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InvestResponse = 21729u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CharacterMoveToPointEndPush = 21734u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddEntityAoiNotify = 21738u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchEventChoiceResponse = 21742u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceEnterInstNotify = 21747u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FunPlayChallengeInfoUpdateNotify = 21748u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UsePhantomEquipGroupResponse = 21750u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StartMatchRequest = 21756u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelSoarRewardRequest = 21758u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreActivityTaskInfoNotify = 21764u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NetTestDataPush = 21765u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaughtRequest = 21766u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldResultNotify = 21768u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationAttrRequest = 21778u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopInstRequest = 21786u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerTitleUpdateNotify = 21787u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchThreeStarRequest = 21794u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrnamentDressInfoUpdateNotify = 21795u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBeamReceiveResponse = 21799u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderApplyBuffRequest = 21800u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddSysBuffNotify = 21803u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetPlayerYuXueModeRequest = 21804u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NormalMonsterManualInfoRequest = 21805u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialStartRequest = 21807u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillAddPush = 21813u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueLevelPlayNotify = 21815u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoFightTaskRewardRequest = 21817u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceRankShowNameRequest = 21818u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropCatchLevelFinishRequest = 21819u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorParkourStartNotify = 21824u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingActivityLimitTaskNotify = 21833u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiBlackboardsPush = 21837u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherSwitchInfoResponse = 21840u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponLevelUpResponse = 21842u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerTaskRewardResponse = 21846u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPosAbnormalResponse = 21848u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryInstSettleNotify = 21849u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockSyncInfoNotify = 21853u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerCycleStartRequest = 21855u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowerPollutionSplinePush = 21867u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OnlineMotorEndNotify = 21868u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SunSpiritListNotify = 21877u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaUsePoolRequest = 21879u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FuncShowResponse = 21886u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleShowListUpdateResponse = 21892u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthDayRewardResponse = 21898u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewBieCourseRewardNotify = 21899u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrLibraryTaskUpdateNotify = 21906u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeLockInfoNotify = 21913u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementFinishResponse = 21914u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionFinishResponse = 21915u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityFirstReadRequest = 21916u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2TaskDataUpdateNotify = 21917u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationModifyRequest = 21924u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillRemoveRequest = 21925u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowActionResponse = 21929u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayGiftRequest = 21930u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerVoxelEnvResponse = 21932u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemRewardNotify = 21938u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TotalTopUpScoreInfoResponse = 21941u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulPhantomBattleMasterLevelRewardResponse = 21948u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRoleAddNotify = 21949u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifyBulletParamsPush = 21952u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleMotionNewCanUnLockNotify = 21957u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TestCmdNotify = 21962u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2TreeBuildRequest = 21969u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TutorialUnlockResponse = 21973u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetChapterRewardRequest = 21975u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustAcceptRequest = 21980u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerRewardRequest = 21982u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TreasureChestCountNotify = 21988u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRankListResponse = 21992u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneLoadingFinishNotify = 22001u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBuffProducerResponse = 22006u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayFirstNotify = 22014u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallItemRewardNotify = 22016u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RolePropRequest = 22020u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LongShanTaskRewardResponse = 22021u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DamageExecuteRequest = 22022u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingShipInfoUpdateNotify = 22031u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseTechPointUpdateNotify = 22033u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillRemoveNotify = 22034u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GmEntityFsmGroupInfoRequest = 22037u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterDetectionInfoResponse = 22038u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerResultNotify = 22039u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchUpdatePlayerInfoNotify = 22040u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrnamentUnlockNotify = 22041u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssSelfPassResponse = 22042u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyQuestStateNotify = 22047u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonTargetUpdateNotify = 22048u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LowMemoryChangeSceneFinishRequest = 22050u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetClientGlobalVarResponse = 22056u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityResultUpdateNotify = 22058u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SheriffCriminalUpdateNotify = 22065u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ControlInfoNotify = 22077u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimePointActivityBatchRewardResponse = 22079u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlaySwitchSportModeResponse = 22082u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GatherClueInfoNotify = 22089u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoShopRewardLockRequest = 22092u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEntityBuffLayerCountNotify = 22102u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinTrialUiEndPush = 22109u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyRechallengeResponse = 22112u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchCloseTaskRequest = 22122u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerFunctionPreUnlockResponse = 22129u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLockItemResponse = 22131u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSkillFailRequest = 22140u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleStateChangeNotify = 22142u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerInfoResponse = 22143u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrManualSwitchTraceRoadResponse = 22149u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangePlayerTitleRequest = 22152u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTechUnlockNotify = 22153u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AfterJoinSceneNotify = 22156u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmShipStartNotify = 22158u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayEntityMontagePush = 22159u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookEditPresetRequest = 22163u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestGiveUpNotify = 22166u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorPositionStatePush = 22169u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchRefiningResponse = 22170u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseDevelopResetRequest = 22176u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseEntityDataChangeNotify = 22179u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TriggerExitSkillResponse = 22190u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SysInfoNotify = 22193u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustHandInRequest = 22195u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicSwitchResponse = 22198u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTalentInfoRequest = 22199u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBadgeInfoUpdateNotify = 22202u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessRewardResponse = 22205u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassRecurringTakeResponse = 22206u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HostTeleportUnlockNotify = 22223u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollDeliveryRequest = 22224u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitItemInfoNotify = 22231u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowEndNotify = 22237u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportDataRequest = 22238u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneTestNotify = 22242u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestStarRewardResponse = 22246u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MowTowerFirstScoreNotify = 22248u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookingDataRequest = 22249u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssChallengeGotoNextRoomResponse = 22250u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetFocusModeDeterCondResponse = 22252u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBackSlotCardLibraryResponse = 22253u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PickUpDropItemResponse = 22257u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueQuitRequest = 22259u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MaterialResponse = 22263u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayUnlimitedModeResponse = 22265u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SettingNotify = 22267u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleMotionUnLockRequest = 22268u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BrochureRewardResponse = 22272u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseGetRewardResponse = 22279u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportSetCurUseTrialRoleResponse = 22287u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorTalkScoreRequest = 22288u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveEntityAoiNotify = 22294u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightLastSaveDataRequest = 22296u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AreaTerminalInfoNotify = 22310u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinResponse = 22316u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrPhoneTaskRewardRequest = 22319u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldLevelRegainResponse = 22321u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerClearRecordRequest = 22324u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerResetResponse = 22328u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialSelectBossResponse = 22338u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssLittleRoleLevelUpRequest = 22340u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGarbInsertCoinRequest = 22346u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TotalTopUpScoreInfoRequest = 22350u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookingFormulaUpdateNotify = 22353u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffItemResponse = 22356u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FeiXuePreheatInfoRewardResponse = 22363u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchFailNotify = 22367u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitNodeResponse = 22370u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ForgeItemRequest = 22375u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeGotoNextRoomResponse = 22376u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackCoastThemeTaskRewardRequest = 22379u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneSubLevelsNotify = 22380u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbUpLevelSkillRequest = 22382u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportVehicleNotify = 22384u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResetBabelTowerLevelResponse = 22385u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaAccumulateInfoRequest = 22393u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenMotorRewardRequest = 22394u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExchangeSharedInfoNotify = 22397u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttributeInitRequest = 22401u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsTaskResponse = 22403u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityUpdateNotify = 22413u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTalentUnlockNotify = 22418u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveTaskInfoNotify = 22419u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryAreaTaskInfoUpdateNotify = 22423u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemSequenceFrameStartRequest = 22424u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityTaskInfoNotify = 22425u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityPointResponse = 22430u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetFormationDataResponse = 22433u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyBuffFailedNotify = 22435u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieAdventureTaskUpdateNotify = 22437u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NormalItemResponse = 22445u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieFetchScoreRewardResponse = 22454u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EndLessHistoryResponse = 22456u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSkillFailPush = 22464u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TurntableCompleteResponse = 22465u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatMaxCaseMessageRequest = 22467u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CaptureEntityResponse = 22470u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OnlineMotorActivityLevelResponse = 22472u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleTrackReportResponse = 22473u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DestroyBulletResponse = 22475u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulMapTravelTaskRewardResponse = 22477u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashMsgRequest = 22482u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomLevelUpResponse = 22489u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerLivingStatesNotify = 22492u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveHackingEntityNotify = 22506u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActorVisiblePush = 22507u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SunSpiritActionOperationNotify = 22508u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoReChallengeRequest = 22515u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockSplitHumanSwitchStateNotify = 22518u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehiclePlatformGetOnRequest = 22526u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayGiftConditionFinishNotify = 22528u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestFinishActionEndResponse = 22532u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomAttrRecommendResponse = 22535u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLifeSupportUpResponse = 22538u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffEffectRequest = 22540u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TestDamageRecordNotify = 22542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityLevelNotify = 22544u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRefreshCollectionRequest = 22546u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerBasicInfoGetResponse = 22549u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledDestroyRequest = 22559u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreScoreRewardRequest = 22561u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuildingUnLockResponse = 22569u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAccessRangeResponse = 22572u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SelectDetectionTargetResponse = 22576u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingInfoUpdateNotify = 22579u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CharacterDeathResponse = 22581u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicInfoResponse = 22582u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockSplitPopWindowNotify = 22587u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingInfoResponse = 22596u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpecialItemUnEquipRequest = 22601u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkTopicSelectResponse = 22606u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnOpenedAreaPullbackRequest = 22608u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssPluginSynthesisRequest = 22615u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CorniceMeetingRewardResponse = 22628u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OnlineMotorSettleNotify = 22637u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleRemovePassengerRequest = 22646u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballBonusFullWinResponse = 22647u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanFindPlanRequest = 22650u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollDeliveryNotify = 22651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSlotCardSkillRequest = 22653u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestNpcMoveOverRequest = 22658u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupInfoNotify = 22666u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleQuestStateNotify = 22674u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerRecommendRequest = 22684u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTaskInfoNotify = 22685u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillAddNotify = 22690u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoFightTaskRewardResponse = 22692u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FastReturnDungeonResponse = 22693u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionFinishImmediatelyNotify = 22694u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTalentUnlockResponse = 22696u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsOpDoneResponse = 22698u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoteBatchCollectRequest = 22702u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchPolishRequest = 22703u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlEventSelectResponse = 22706u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopRefreshResponse = 22722u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityMotorOutlookChangeNotify = 22728u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PressGameResponse = 22730u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    Summon3Request = 22732u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderRemoveBuffByTagsRequest = 22742u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTraceInfoRequest = 22743u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeSeasonDataRequest = 22746u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymBeginResponse = 22749u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CameraSettingQueryResponse = 22753u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EncircleChallengeUpdateNotify = 22754u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseRefreshShopRequest = 22766u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuildingLevelUpResponse = 22769u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ANStartPush = 22773u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchCloseTaskResponse = 22776u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightOneKeyRewardRequest = 22785u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookAddNotify = 22787u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryActivityInfoRequest = 22792u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DamageExecuteResponse = 22796u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollSmallMapInfoResponse = 22797u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleQuestPointStateResponse = 22800u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSlotInsteadRequest = 22801u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayGachaRefreshResponse = 22802u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopUpdateResponse = 22804u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupDeleteRequest = 22811u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OccupyRewardResponse = 22814u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HandInItemRequest = 22822u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmPlayMontageResponse = 22825u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrRoadBuildResponse = 22831u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSelectTargetEffectNotify = 22838u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerTaskRewardResponse = 22840u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AllDarkTideMapMarkNotify = 22844u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QueryRecallItemBagResponse = 22846u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockMovementFinishResponse = 22850u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockUpdateGamePlayNotify = 22853u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbRoleResonLockFinishNotify = 22856u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleMotionActiveNotify = 22861u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OtherJoinSceneNotify = 22868u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollDeliveryResponse = 22869u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchSettleDataRequest = 22870u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoShopRewardRefreshResponse = 22871u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsCloseSettleMenuResponse = 22872u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DiscardWeaponResponse = 22877u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmConditionPassRequest = 22886u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueInsListRequest = 22892u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemSequenceFrameStartResponse = 22907u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementReceiveResponse = 22908u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyGameplayEffectResponse = 22915u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SelectBabelActivityDeTermRequest = 22917u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomVicePolishAckResponse = 22926u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeEntityStateRequest = 22928u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SitChairResponse = 22930u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalDieResponse = 22932u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DestroyBulletPush = 22933u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttachEntityRequest = 22935u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationChangeResponse = 22944u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTraceResponse = 22948u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FollowTrackResponse = 22950u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantResponseNotify = 22958u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTrainRequest = 22959u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayRemoveUnitRequest = 22961u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResonantChainOptionalLimitResponse = 22963u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleAreaSkillRequest = 22966u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewLinkBurstPush = 22970u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleAreaSkillCdNotify = 22971u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyGameplayEffectRequest = 22973u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MontagePlayRequest = 22974u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateMonsterUnlockNotify = 22978u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DamageRecordNotify = 22979u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantItemAccessUnlockNotify = 22982u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NormalItemRequest = 22983u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchInfoResponse = 22985u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonSettleRequest = 22986u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlaceItemOnBoardNotify = 22990u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FoundationCoreOperateRequest = 22998u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTaskUpdateNotify = 23000u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ElevatorStateChangeRequest = 23005u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymGroupInfoUpdateNotify = 23018u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockItemUpdateNotify = 23026u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorSummonAndRidePush = 23028u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulFishingIllustratedRewardRequest = 23031u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PartUpdateNotify = 23036u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyArtifactSelectRequest = 23037u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsTalentLevelUpResponse = 23041u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessUseSkillRequest = 23048u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledPosInFoundationNotify = 23053u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessTaskTakeRequest = 23058u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ANStartRequest = 23064u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemStopResponse = 23071u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsHandBooskUnlockNotify = 23073u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingBuffUpdateNotify = 23086u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinAddNotify = 23089u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AtomicProcessRemoveBuffResponse = 23095u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VacuumCleanerResponse = 23100u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DissolveCombineRelationResponse = 23102u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrialRoleRewardResponse = 23104u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchWeeklyRequest = 23105u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryWeaponDressRequest = 23107u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportUpdateNotify = 23109u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerInfoUpdateNotify = 23114u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideFinishRequest = 23117u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryBagSizeUpdateNotify = 23119u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddReviveRegionRequest = 23120u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushBatchClaimRewardRequest = 23121u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrPhoneTaskRewardResponse = 23125u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopBuyRequest = 23126u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchSceneGroupNotify = 23134u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleFinishResponse = 23136u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetMatchTeamMatchFlagResponse = 23137u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResOpDoneRequest = 23138u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedUnlockNotify = 23144u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAccessRangeRequest = 23148u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchExecuteSkillPlayRequest = 23150u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlBagUpdateNotify = 23151u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StartMatchNotify = 23153u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StorageInfoUpdateNotify = 23161u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneSubLevelsChangedNotify = 23168u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MiniWriteLetterSaveContentResponse = 23170u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GivebackRewardRequest = 23177u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayEventChoiceRequest = 23181u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemDecomposeResponse = 23183u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallExploreSkillRouletteSetResponse = 23185u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityRandomInteractRequest = 23187u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRepeatedTaskRewardRequest = 23196u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorLevelUpdateNotify = 23198u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationRequest = 23200u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerNetStateBackServerPush = 23205u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiBlackboardsResponse = 23212u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffItemRequest = 23217u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrArchiveTaskRewardRequest = 23218u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorSliderRequest = 23230u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ProgressBarFinishResponse = 23237u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConfirmCompleteRefMp4QuestNotify = 23244u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FixToolResponse = 23245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementListProgressNotify = 23250u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityFoundationCoreChangeNotify = 23251u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTidePickUpItemRequest = 23254u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulRogueWeeklyRewardResponse = 23258u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestArtifactNotify = 23260u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SignActivitySignStateNotify = 23272u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemExchangeResponse = 23286u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemDisuseRequest = 23288u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookFoodResponse = 23290u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdventureManualResponse = 23292u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BatchMaterialReplaceRequest = 23293u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapUnlockFieldInfoRequest = 23298u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerCreatePsnSessionResponse = 23299u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleReChallengeRequest = 23304u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrFireUpdateNotify = 23308u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmTaskOneKeyRewardRequest = 23309u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BanChatNotify = 23311u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerUpdateRecordResponse = 23318u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementInfoRequest = 23322u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrLevelUpResponse = 23326u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PartUpdateRequest = 23337u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueGainDataUpdateNotify = 23339u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustUpdateNotify = 23340u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActorVisibleNotify = 23346u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeStopPush = 23351u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StartRecallResponse = 23357u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvoidBlockSubmitOverNodeResponse = 23361u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatHistoryRequest = 23362u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyResultNotify = 23363u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialReChallengeRequest = 23366u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestRollBackEndNotify = 23374u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSceneGroupDataRequest = 23380u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlFightActionNotify = 23382u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTotalShopItemUpdateNotify = 23383u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MontagePlayResponse = 23384u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayUnlimitedModeRequest = 23389u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FuncOpenNotify = 23390u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RolePhantomPropUpdateNotify = 23392u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityIsVisiblePush = 23399u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsMonsterConsecutiveKillsNotify = 23401u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityDeTermInfoNotify = 23405u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinRequest = 23414u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LandingDamageRequest = 23415u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtGiveUpResponse = 23416u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveRewardResponse = 23419u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushLevelScoreRewardRequest = 23421u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeTransRequest = 23432u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssReviveNotify = 23441u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSailingRequest = 23442u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyTaskAddNotify = 23445u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AgreeJoinResultRequest = 23449u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeTakeResponse = 23450u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthdayInitResponse = 23451u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleGuideRewardResponse = 23453u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestNpcMoveOverRequest = 23456u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerTaskDataUpdateNotify = 23458u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSelectGainingGroupRequest = 23459u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSkillEffectFailNotify = 23479u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatRequest = 23483u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlEventRefreshResponse = 23486u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockPointResponse = 23488u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResInstGlobalDataNotify = 23490u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveBuffByServerIdS2cRequestNotify = 23494u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorUseSceneResponse = 23495u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HandInMingSuRequest = 23496u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KickWorldTeamRequest = 23500u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballSpawnFirstFinishNotify = 23508u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityStateReadyNotify = 23517u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestRedDotNotify = 23522u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTraceNotify = 23529u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsPlayerInfoRequest = 23533u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinChangeResponse = 23541u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerVarNotify = 23542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrFireNoticeResponse = 23545u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoRefineWeaponNotify = 23546u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GaSwitchCommonEnemyProCampResponse = 23547u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterPatrolPointReachedResponse = 23552u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmSettleRequest = 23554u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorCreateRequest = 23555u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewHandInItemResponse = 23562u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeBossInstStartRequest = 23564u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityLevelRequest = 23568u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VacuumCleanerRequest = 23579u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkSettleRequest = 23581u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapRemoveAllMarkResponse = 23583u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityEquipSkinChangeNotify = 23591u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HandInMingSuResponse = 23593u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinUnLoadResponse = 23595u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryTopInfoNotify = 23604u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendApplyHandleResponse = 23606u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeTransResponse = 23607u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchUnlockTechPointResponse = 23616u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolStopResponse = 23618u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NormalMonsterManualInfoResponse = 23619u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoadEquipInfoResponse = 23620u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThirdPartySharedNotify = 23622u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateFormationNotify = 23626u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomCollectReceiveResponse = 23631u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VisionExploreSkillSetRequest = 23633u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayGiftSuccessNotify = 23642u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EncircleChallengeCompleteResponse = 23650u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetInitTagRequest = 23652u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TemporaryTeleportAllInfoNotify = 23653u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportFinishRequest = 23654u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWhiteCatRecordRequest = 23656u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetFanStateResponse = 23657u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolStartResponse = 23660u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationSwitchRoleResponse = 23668u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerGameTokenRequest = 23683u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeTakeRequest = 23686u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvignonRewardRequest = 23689u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldBlackboardResponse = 23698u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterBoomResponse = 23701u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssReviveCharacterResponse = 23705u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackCoastThemeActiveRewardRequest = 23707u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushBatchClaimRewardResponse = 23711u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendDeleteRequest = 23712u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KickMatchTeamPlayerResponse = 23716u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrManualSwitchTraceRoadRequest = 23717u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTalentInfoResponse = 23720u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDealCardReplaceResponse = 23721u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookRegionInfoNotify = 23727u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStorySafeLeaveNotify = 23728u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideInfoResponse = 23730u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashSkinUpdateNotify = 23736u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveLevelPlayNotify = 23737u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvoidBlockSettlementNotify = 23738u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillAddRequest = 23740u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddUnlockedGuideNotify = 23741u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecRoleFightFlowRequest = 23744u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmSubLevelUpdateNotify = 23745u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendRemarkRequest = 23751u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestListNotify = 23759u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneGroupDataAndCurFormationEntityResponse = 23762u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CancelQuestFocusModeRequest = 23764u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LastBigSceneMiniMapInfoResponse = 23770u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeStateConfirmResponse = 23779u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityChangeDynamicInteractTextNotify = 23782u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardRoleSkillResponse = 23783u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemFuncValueUpdateNotify = 23784u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowStartNotify = 23786u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseItemUpdateNotify = 23792u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashLevelRewardRequest = 23794u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    H5CircumFluenceActivityReadRequest = 23797u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewBieCourseRewardResponse = 23806u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CoopSpRewardRequest = 23809u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalTaskRewardRequest = 23817u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    XboxSettingResponse = 23818u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeadeyeShootHitResponse = 23822u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressActivityTrialRoleUpdateNotify = 23826u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabPauseEndRequest = 23827u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagStrongholdInfoUpdateNotify = 23830u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LobbyQueryPlayersResponse = 23831u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewLinkNotify = 23833u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightBossDropNotify = 23836u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MaxMessageIdPush = 23839u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolChangeDirResponse = 23851u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterAreaResponse = 23858u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCourseV2RewardNotify = 23862u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockUpdateAvailableInputsNotify = 23864u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneStepInfoNotify = 23865u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceInstanceRewardResponse = 23869u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageInfoResponse = 23875u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmPlayMontagePush = 23876u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleUpdateNotify = 23879u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDealCardReplaceRequest = 23882u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecWorldSEndFlowRequest = 23884u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ForgeInfoRequest = 23896u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DirectTrainPreOpenCloseNotify = 23904u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisFormulaUnlockRequest = 23907u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballBonusFullWinRequest = 23910u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TotalTopUpRewardRequest = 23916u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResIllustrationAwardResponse = 23918u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfluenceInfoUpdateNotify = 23919u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2ScoreRewardResponse = 23928u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopAnimPush = 23930u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingActivityMilestoneItemNumNotify = 23932u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReportPlayerResponse = 23940u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityLivingStatusNotify = 23945u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ToughCalcExtraRatioChangeRequest = 23954u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityEnterVehicleRequest = 23956u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleRemovePassengerResponse = 23958u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingQuickSellRequest = 23963u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantDeliveryItemRequest = 23968u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveBuffS2cResponsePush = 23971u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomDirectRefiningWeeklyResetNotify = 23980u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushTaskUpdateNotify = 23983u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushBuffChooseResultRequest = 23993u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoScoreTaskReceiveRequest = 23998u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAccessRangeNotify = 24009u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballFriendRankResponse = 24014u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchCharacterStateResponse = 24015u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisItemResponse = 24016u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledDestroyResponse = 24018u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSelectTargetRequest = 24025u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightGameOverNotify = 24027u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillRouletteSetResponse = 24039u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityResponse = 24041u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FinishDownloadQuestResourceResponse = 24046u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemMoveSplineRequest = 24048u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheckUseSoundBoxSkillRequest = 24052u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookInfoRequest = 24056u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityLevelDiffRequest = 24064u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResGainDataTotalNotify = 24073u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlaySelectCardGroupResponse = 24077u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FeiXuePreheatInfoUpdateNotify = 24082u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTalentInfoResponse = 24083u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyBlackFlowerNotify = 24088u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonRolePropChangeNotify = 24089u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewJourneyRequest = 24090u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SunSpiritUpdateNotify = 24091u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EndLessHistoryRequest = 24101u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSkillTriggerInfoNotify = 24105u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterDrownPush = 24106u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemExchangeRequest = 24108u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportActivityTrialRoleUpdateV2Notify = 24111u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlFightOverRequest = 24115u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityIsVisibleRequest = 24121u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleEnterSharingRequest = 24127u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoadingLevelAreaRequest = 24141u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerTaskRewardRequest = 24142u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchThreeEndRequest = 24146u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockPointInfoNotify = 24148u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitWalkingPatternPointResponse = 24149u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvoidBlockClientInitDoneRequest = 24150u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayStateResponse = 24154u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FunPlayChallengeAwardRequest = 24156u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchUnlockTechPointRequest = 24158u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponBreachResponse = 24159u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadNetworkEntityUpdateCurRoadPush = 24166u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapRemoveMarkResponse = 24173u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityStaticHookMoveResponse = 24175u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenLevelUpRequest = 24178u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapUnlockFieldInfoResponse = 24181u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballInGameStarChangeNotify = 24193u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailGetAttachmentRequest = 24199u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayGachaRequest = 24204u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseAuxiliaryBranchResponse = 24209u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeEntityRoleResponse = 24212u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayRewardRequest = 24224u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleGoDownNotify = 24225u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchBattleModeNotify = 24226u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestBranchResponse = 24229u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeEventGainNotify = 24233u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerShowNameRequest = 24234u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightLastSaveDataResponse = 24235u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakNotify = 24240u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PreheatSignSurveyInfoResponse = 24249u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrInfoResponse = 24251u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRoleSelectUpdateNotify = 24255u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerAccessCasketRequest = 24257u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceRequest = 24258u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveMarkInfoNotify = 24260u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTechLevelUpRequest = 24261u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BathChangeCameraResponse = 24262u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessRewardRequest = 24268u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetLegMatchResultNotify = 24273u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBattleInfoResponse = 24276u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerPreUnlockAvailableNotify = 24277u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateMessageNotify = 24284u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientCurrentRoleReportResponse = 24285u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikePopularEntriesInfoResponse = 24291u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoShopRewardRefreshRequest = 24293u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MowTowerSettlementResponse = 24294u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InspirationUnlockChoiceResponse = 24295u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleConfigInfoUpdateNotify = 24298u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlEventRefreshRequest = 24299u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchEventChoiceRequest = 24306u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryPickUpItemRequest = 24310u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryInstLeaveRequest = 24314u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExecuteQtePush = 24316u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationAutoAddRoleNotify = 24318u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ToughCalcExtraRatioChangePush = 24319u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchChangePlayerUiStateRequest = 24320u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessStartNewResponse = 24323u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QingXiaoTaskRewardResponse = 24325u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressBonusRequest = 24329u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushLevelInfoNotify = 24337u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponItemAddNotify = 24339u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseTechUnlockResponse = 24341u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoveSceneItemNotify = 24344u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NavigationFindPathRequest = 24357u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoRoleRecordRequest = 24358u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetDetectionLabelInfoResponse = 24360u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityResultResponse = 24362u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResMoveRequest = 24363u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddPhantomEquipGroupRequest = 24382u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSkinAddNotify = 24383u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardSelectResponse = 24389u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowEndResponse = 24390u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoralePosRequest = 24392u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleAntiCheatingLogNotify = 24393u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryDiscardItemResponse = 24394u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressTaskResponse = 24403u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommonOrganResetTimeResponse = 24405u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FallFinishNotify = 24409u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldEnterPermissionsRequest = 24417u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoMemoryResponse = 24419u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPreloadNotify = 24436u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleUpdateDevelopTargetNotify = 24438u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialStartResponse = 24439u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleStartResponse = 24441u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetRewardTreasureBoxRequest = 24443u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EquipSkinTakeOnResponse = 24452u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrLevelUpRequest = 24462u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchBattleModeRequest = 24463u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleQuestAcceptResponse = 24464u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoteBatchCollectResponse = 24465u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushSettlementRequest = 24466u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneStepGroupInfoNotify = 24473u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GravityFlipInteractResponse = 24474u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    H5CircumFluenceActivityDataNotify = 24475u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabPauseStartResponse = 24478u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsTaskDataUpdateNotify = 24480u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerXboxBlockListResponse = 24484u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponResonUpResponse = 24490u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryResidentTaskInfoUpdateNotify = 24495u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvoidBlockClientInitDoneResponse = 24499u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmRoleUpdateNotify = 24501u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorPositionStateNotify = 24502u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapReplaceMarkResponse = 24504u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateEnableFunctionNotify = 24510u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PsnSettingResponse = 24512u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeWriteCatLevelPlayRewardRequest = 24513u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballWeaponDegradeRequest = 24517u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetInitTagResponse = 24518u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderRemoveBuffByTagsNotify = 24520u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookingDataResponse = 24521u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiBlackboardCdResponse = 24526u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolAddTagRequest = 24527u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyJoinWorldResponse = 24536u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RenameFormationRequest = 24542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DragonPoolConfResponse = 24543u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTaskUpdateNotify = 24544u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InspirationUpdateNotify = 24547u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeChooseDataNotify = 24553u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballTeamDieResponse = 24554u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TetrisUpdateResponse = 24555u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBvBLoadingFinishResponse = 24562u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelSequenceFrameEventActionRequest = 24567u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryBagInfoUpdateNotify = 24569u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GatherActivityRewardRequest = 24573u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsOpDataForceChangeNotify = 24578u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EndSkillRequest = 24580u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeEntityRoleRequest = 24583u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballTeamDieRequest = 24584u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymBeginRequest = 24586u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NameModifyNotify = 24589u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatHistoryNotify = 24594u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnergySyncRequest = 24596u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestReviewInfoRequest = 24599u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstEntranceDetailRequest = 24602u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedInfoResponse = 24603u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBoardInfoNotify = 24606u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryActivityInfoResponse = 24610u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballSetPayloadResponse = 24616u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymInfoRequest = 24619u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestReadyListNotify = 24620u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRoundOverRequest = 24624u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerSettlementResponse = 24625u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterLevelNotify = 24635u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldTeamPlayerInfoChangeNotify = 24636u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewHandInItemRequest = 24640u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MaterialPush = 24645u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueGotoNextRoomCommitRequest = 24658u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomItemRequest = 24659u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ANStartNotify = 24660u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityBuffInfoNotify = 24665u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityRequest = 24675u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieAdventureRoleRewardRequest = 24679u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanUsePlanResponse = 24680u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSelectReserveCardNotify = 24681u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SunSpiritCollectNotify = 24685u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantMaxLevelDeliveryItemRequest = 24688u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InterruptSkillInDelayPush = 24695u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddTreasureBoxSlotRequest = 24696u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportTrialRoleLvUpResponse = 24698u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PickUpDropItemRequest = 24705u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleOperateSelfBgmRequest = 24710u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetLegMatchSettleNotify = 24713u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PsnSettingRequest = 24714u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreatStoryCharacterRequest = 24716u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityWalkingPatternFinishRequest = 24720u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoEndSpecialWaveCombatRequest = 24724u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShowPasserByNpcNotify = 24738u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2TaskRewardRequest = 24745u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSpecialRewardUpdateNotify = 24748u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MovePackagePush = 24756u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookEditPresetResponse = 24760u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingPointInfoRequest = 24764u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSexChangeRequest = 24765u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalTaskRewardResponse = 24773u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FuncOpenConfirmNotify = 24775u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LogicStateInitNotify = 24779u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionNotify = 24784u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallItemBagObtainNotify = 24789u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryAddWeaponNotify = 24790u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeSubLevelNotify = 24792u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopInfoResponse = 24794u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendApplyHandleRequest = 24797u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefencePhantomInfoUpdateNotify = 24798u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBvBLoadingNotify = 24799u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StorageInfoNotify = 24801u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveTemporaryTeleportResponse = 24806u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LongShanStageUpdateNotify = 24809u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimelineTraceExitRequest = 24811u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookLevelUpRequest = 24814u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicCollectUpdateRequest = 24815u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorUseSceneRequest = 24816u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveSysBuffNotify = 24831u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestStarRewardRequest = 24832u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TotalTopUpRewardResponse = 24834u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTidePoisonCircleStartShrinkNotify = 24836u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExhibitionItemSaveResponse = 24838u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTokenReceiveRequest = 24840u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveActivityInfoResponse = 24847u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportTrialRoleLvUpV2Request = 24861u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreatStoryCharacterResponse = 24862u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushChooseBuffRequest = 24869u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HardnessModeChangedNotify = 24870u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResEndingRewardResponse = 24880u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabTimeBallResponse = 24886u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchInviteNotify = 24891u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookFullChangeNotify = 24893u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRoundChangeNotify = 24896u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledRequest = 24899u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerHeadAddNotify = 24903u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorListResponse = 24905u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrThemeActivityTaskDataUpdateNotify = 24908u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoShopRewardSelectRequest = 24909u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayGachaRefreshRequest = 24913u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JoinWorldTeamNotify = 24920u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportTransferResponse = 24923u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DestroyRecallQuestsNotify = 24930u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AccessPathConfigResponse = 24933u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowRestartRequest = 24934u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecWorldInfoFlowResponse = 24938u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveAoiNotify = 24943u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScheduleRewardUpdateNotify = 24945u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlacementInfoChangeNotify = 24946u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBlackboardResponse = 24947u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTaskAwardResponse = 24954u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightTaskUpdateNotify = 24956u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDebugInfoRequest = 24959u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FoundationRequest = 24967u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakTimeRequest = 24968u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UDPMovePackagePush = 24978u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestChangeTraceNotify = 24980u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDecalMotorIpResponse = 24987u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTaskAwardRequest = 24996u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseChallengeQuitResponse = 24998u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingNoticeUpdateNotify = 25001u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieAdventureRoleRewardResponse = 25004u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerApplyFloorDataRequest = 25005u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JSPatchNotify = 25006u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReorderFormationResponse = 25008u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTalentUnlockNotify = 25010u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmRankListRequest = 25012u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingRewardResponse = 25013u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorLevelOneKeyRewardRequest = 25015u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResEndingRewardRequest = 25016u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightSettleRequest = 25017u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayRefreshShopRequest = 25019u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailInfosNotify = 25021u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResGridEventResponse = 25023u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AceAntiDataPush = 25028u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleLeaveSlotResponse = 25036u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerBattleStateChangeNotify = 25044u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrThemeActivityAwardRequest = 25047u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateEnableSystemNotify = 25057u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDataNotify = 25061u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleUpdateEntityNotify = 25063u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddOccupationInfoNotify = 25073u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntranceStateNotify = 25077u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneSubLevelsRequest = 25079u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPosResetNotify = 25086u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestEndNotify = 25092u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyResultRequest = 25097u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballWeaponWearResponse = 25098u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressQuestionOpenRequest = 25100u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GridCellUpdateNotify = 25103u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSkinChangeRequest = 25116u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTaskOneKeyRewardRequest = 25118u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoShopRewardNotify = 25121u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EndSkillNotify = 25131u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoRoleRecordResponse = 25139u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuickHackRamVerifyPush = 25141u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillActionRequest = 25144u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsVarRecordNotify = 25152u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportDungeonActionRequest = 25153u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeOpenNotify = 25157u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelLevelUpRequest = 25161u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailBindRequest = 25162u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBackLibraryRequest = 25172u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CharacterLookAtNotify = 25173u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceUpdateNotify = 25178u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdventureUpdateNotify = 25180u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemObtainNotify = 25181u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldPointRepeatedResponse = 25184u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAddNotify = 25185u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendApplyDeletedNotify = 25186u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeWriteCatBossRewardRequest = 25187u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiHatePush = 25194u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FoodProcessResponse = 25197u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamParkourSettleNotify = 25201u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReportPlayerRequest = 25202u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBadgeRewardInfoUpdateNotify = 25204u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponRemoveNotify = 25207u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PartComponentInitResponse = 25211u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeWeatherRequest = 25213u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerSettlementRequest = 25214u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestActionResponse = 25218u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeTempRoleLevelNotify = 25219u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GmIsOverlapNotify = 25221u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchDirectRefiningRequest = 25223u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrArchiveReadResponse = 25225u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSystemInfoNotify = 25227u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapCancelTraceNotify = 25230u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTalentUnlockNotify = 25233u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightKillResponse = 25235u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LogicStateInitResponse = 25241u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueInstExtraInfoRequest = 25243u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    XboxSettingUpdateResponse = 25251u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerRebackSceneNotify = 25253u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveReviveRegionRequest = 25255u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerLastCycleInfoRequest = 25259u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoadEquipInfoRequest = 25260u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SheriffZoneInfoResponse = 25267u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchActionResponse = 25269u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaRequest = 25270u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddCombineEntitiesRelationNotify = 25278u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoScoreTaskReceiveResponse = 25285u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillRouletteUpdateNotify = 25292u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthdayInitRequest = 25294u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetQuestResourceStateResponse = 25299u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationModifyResponse = 25309u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldPointRepeatedRequest = 25310u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSelectTargetResponse = 25311u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GatherTaskRecordNotify = 25315u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SelfPortraitStateRequest = 25316u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAdsorbResponse = 25318u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockExitGamePlayRequest = 25320u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicSaveRequest = 25322u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsInstGlobalDataNotify = 25324u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReadCardResponse = 25329u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoChestRewardNotify = 25333u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterDrownResponse = 25334u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchSettleResponse = 25335u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WillSwitchSceneGroupNotify = 25350u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlySkinWearAllRoleResponse = 25354u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FireShopCoinNotify = 25358u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockInputRequest = 25360u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleDevelopConfigUpdateNotify = 25367u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattlePhantomCardSkillResponse = 25369u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeamCastHitPlayerRequest = 25375u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssPluginItemInfoUpdateNotify = 25376u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopBuyResponse = 25381u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryTotalRevenueNotify = 25388u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SelfPortraitStateResponse = 25392u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkinChangeRequest = 25393u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceEntityPosResponse = 25394u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchInviteRetToHostNotify = 25396u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanBatchOperResponse = 25404u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleBreakThroughViewRequest = 25405u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GravityGearResponse = 25409u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiBlackboardCdPush = 25416u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightAddCollectionNotify = 25419u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockMovementFinishRequest = 25423u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillCustomRequest = 25431u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UDPMovePackageNotify = 25437u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MowTowerSettlementRequest = 25440u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueInstExtraInfoUpdateNotify = 25441u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoChestRewardSelectResponse = 25445u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmPlayMontageRequest = 25452u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponItemRequest = 25468u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResGotoNextRoomResponse = 25469u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookFullRewardResponse = 25470u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayStateListRequest = 25471u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleAreaSkillNotify = 25473u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MowTowerLevelsRewardResponse = 25477u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtRollbackResponse = 25479u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResIllustrationUpdateNotify = 25481u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueShopRefreshResponse = 25485u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InvalidItemResponse = 25487u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExitViewDirectionRequest = 25488u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueEventSelectRequest = 25491u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TutorialReceiveRequest = 25497u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LinkageRewardResponse = 25500u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBadgeRewardRequest = 25505u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleReChallengeResponse = 25507u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuickHackSkillResponse = 25512u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCarnivalAwardResponse = 25525u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTrialSettleNotify = 25527u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfluenceInfoRequest = 25529u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityOnLandedRequest = 25532u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingTechLevelUpResponse = 25533u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreActivityTaskRewardResponse = 25543u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomRefiningRequest = 25546u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HitEndRequest = 25554u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbGetRoleListResponse = 25557u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEntityDieRequest = 25559u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnableDamageRecordRequest = 25565u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DetectionTargetChangeNotify = 25568u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityOnLandedNotify = 25577u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeGiveUpGainResponse = 25582u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashLevelRewardResponse = 25587u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestListNotify = 25593u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideFinishResponse = 25597u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorAnimReplaySampleUdpNotify = 25598u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeWriteCatRewardRequest = 25605u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSceneGroupDataResponse = 25607u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStorySellItemRequest = 25624u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomInteractionEquipResponse = 25626u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NavigationFindPathResponse = 25627u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLifeSupportNotify = 25628u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceVoteResponse = 25631u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SitChairRequest = 25632u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockToggleHintResponse = 25640u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWhiteCatLimitedRewardResponse = 25642u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustRefreshRequest = 25644u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetInstExchangeRewardRequest = 25650u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateFormationResponse = 25651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeScheduleIdleNotify = 25662u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopBuyResponse = 25673u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuickHackSkillRequest = 25674u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KickMatchTeamPlayerRequest = 25677u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemLockRequest = 25683u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatReceivePackNotify = 25706u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreProgressRewardResponse = 25710u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemSetPosSenderResponse = 25717u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSkillBombResponse = 25718u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanSetFiveStarSwitchRequest = 25722u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRefreshGainResponse = 25725u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopComposeResponse = 25732u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendDeletedNotify = 25733u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthDayCardRoleRequest = 25746u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalDropResponse = 25751u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchLogicStateResponse = 25754u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyTaskRewardRequest = 25756u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerLordGymLevelPlayResultNotify = 25758u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportV2GachaRoleUpdateNotify = 25759u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CharacterBattleStateChangeNotify = 25768u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleHandCardInfoUpdateNotify = 25772u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportSetCurUseTrialRoleV2Request = 25773u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiftPackPreviewResponse = 25776u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingCageInfoResponse = 25777u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueArchiveSaveRequest = 25782u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballInGameKickBallRequest = 25787u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntitySendEventResponse = 25789u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTideBagUpdateNotify = 25791u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitPhotoNodeRequest = 25793u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSettingBatchUpdateResponse = 25796u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelFullRewardRequest = 25797u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveWorldTeamRequest = 25798u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeStateRequest = 25799u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThemePersonalScoreRequest = 25800u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceVoteUpdateNotify = 25803u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OutputDebugInfoResponse = 25805u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneLoadingFinishResponse = 25807u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardUnlockRequest = 25809u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InvalidItemRequest = 25813u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayInfoResponse = 25815u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmMainLineInfoResponse = 25817u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneGamePlayScopeNotify = 25818u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionGroupCompleteNotify = 25820u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideTriggerResponse = 25821u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlItemEffectShowNotify = 25822u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueTaskRewardTakeRequest = 25823u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyGameplayEffectNotify = 25830u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementProgressNotify = 25834u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    H5ViewActivityDataNotify = 25838u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseStepUpdateNotify = 25839u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayTagRequest = 25844u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PullingFoundationRequest = 25845u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookFormulaResponse = 25849u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlFighterAttrChangeNotify = 25853u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CountryExploreScoreInfoRequest = 25855u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignPhotoRewardRequest = 25857u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingCabinPutRequest = 25860u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationGameplayTagRequest = 25863u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustHandInResponse = 25865u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillRouletteSetRequest = 25875u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpecialItemEquipRequest = 25881u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitWalkingPatternPointRequest = 25883u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportRewardTaskRequest = 25884u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupNameRequest = 25885u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerRoleEnergyRequest = 25896u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AccessPasserbyNpcSpawnerResponse = 25897u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoUpgradeRewardRefreshRequest = 25898u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LongShanTaskRewardRequest = 25899u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeWriteCatLevelPlayRewardResponse = 25902u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstEntranceDetailResponse = 25904u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessRequest = 25906u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsLockResponse = 25907u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WellStreamingFinisRequest = 25917u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MiniWriteLetterSaveContentRequest = 25919u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StorageInfoRequest = 25920u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsTaskRequest = 25921u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryMascotRewardResponse = 25929u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AwakeDynamicPortalRequest = 25931u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerOverNotify = 25940u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedRedDotRequest = 25943u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleShareNotify = 25947u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LinkageCheckInRewardRequest = 25948u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaUsePoolResponse = 25952u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopInfoResponse = 25954u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityFirstReadResponse = 25958u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseAuxiliaryLevelUpRequest = 25960u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRoundOverResponse = 25961u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceModifyResponse = 25965u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceSelfPassResponse = 25970u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorAnimReplaySampleUdpPush = 25977u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayItemSuccessNotify = 25980u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheckUseSoundBoxSkillResponse = 25981u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightEnterSubLevelRequest = 25986u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRefreshNextWaveGroupResponse = 25991u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SummonRandomNotify = 25992u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikePopularEntriesChangeResponse = 25998u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityTimeFlowPush = 25999u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExchangeRewardInfoRequest = 26002u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LoadCalabashSkinInfoRequest = 26014u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalScoreRewardResponse = 26022u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTrainResponse = 26024u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieFetchScoreRewardRequest = 26025u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LowMemoryChangeSceneStartNotify = 26026u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchPolishResponse = 26035u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerRecallInfoNotify = 26036u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SkinRewardResponse = 26041u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneFishPointInfoUpdateNotify = 26043u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchFirstEnterRequest = 26054u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AtomicProcessTeleportRequest = 26055u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreEntityTraceResponse = 26058u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceContentUpdateNotify = 26061u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchBattleModeResponse = 26064u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailFavoriteResponse = 26065u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyStartRequest = 26066u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoResTaskReceiveResponse = 26068u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FastReturnDungeonRequest = 26075u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerInfoRequest = 26076u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NpcTraceFailedResponse = 26082u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomRecommendRequest = 26086u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MowTowerResultNotify = 26088u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopInfoUpdateNotify = 26089u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffEffectExecuteRequest = 26094u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameStatsShowRequest = 26099u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleNpcShowOverRequest = 26102u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRankListRequest = 26103u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefensePreviewFinishRequest = 26107u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressTrialRoleUnlockNotify = 26108u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefensePreviewFinishResponse = 26110u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoFightResultNotify = 26116u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GivebackRewardResponse = 26121u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MiniWriteLetterLoginNotify = 26135u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTrialUiEndPush = 26138u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TutorialReceiveResponse = 26141u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleChangeNameNotify = 26144u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResetLocationForZRangeNotify = 26153u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpecialItemNotify = 26157u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleChallengeUpdateNotify = 26160u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopInfoNotify = 26161u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRoleRewardRequest = 26163u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QingXiaoTaskRewardRequest = 26165u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SkinRewardInfoUpdateNotify = 26166u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackCoastThemeStageUpdateNotify = 26169u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrThemeActivityAwardResponse = 26171u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LogicStateInitRequest = 26172u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThrowDamageRecoveryNotify = 26175u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HandInItemResponse = 26177u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DetectionRequest = 26178u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuildingLevelUpRequest = 26196u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceQuestNotify = 26198u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2FireUpdateNotify = 26200u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyRewardResponse = 26201u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleMasterLevelRewardResponse = 26202u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EquipSkinTakeOnRequest = 26203u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoraleTreasureBoxTraceRequest = 26205u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfluenceRewardResponse = 26210u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterViewDirectionResponse = 26211u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSoundBoxSkillRequest = 26214u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleQuestNewUnlockNotify = 26215u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DestroyBulletRequest = 26218u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LinkExitNotify = 26223u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponSkinUpdateNotify = 26225u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DirectTrainInfoRequest = 26229u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrRoadBuildRequest = 26235u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThroughTrainFinishViewResponse = 26237u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdventureManualRequest = 26238u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SynthesisLevelRewardResponse = 26239u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReceiveRechallengeResponse = 26240u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityPreOpenResponse = 26244u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoGoldAddResponse = 26245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryActivateTalentRequest = 26246u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffStackCountResponse = 26251u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolAddTagResponse = 26261u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QueryRecallItemBagRequest = 26265u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupNameResponse = 26266u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRoleRoomSelectRequest = 26267u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchStartPlayResponse = 26272u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeChooseDataResultRequest = 26274u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomItemResponse = 26275u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTaskUpdateNotify = 26276u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoResTaskUpdateNotify = 26283u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTaskOneKeyRewardResponse = 26287u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryAreaSecretRewardResponse = 26290u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConfirmQuestResourceResponse = 26295u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTideSwitchVisionResponse = 26299u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbGetRoleListRequest = 26301u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2TaskRewardResponse = 26303u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientPullResourcePackageResponse = 26304u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorLevelOneKeyRewardResponse = 26315u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchOutRequest = 26316u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupUpdateResponse = 26320u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchAcceptInviteRequest = 26322u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScheduleRewardResponse = 26326u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerAccessCasketResponse = 26332u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimelineTraceExitResponse = 26335u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleTaskInfoNotify = 26339u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoResTaskReceiveRequest = 26341u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleGiftRewardRequest = 26345u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestActivityUpdateNotify = 26346u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAddDynamicInteractNotify = 26347u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChatMutePlayerResponse = 26353u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailBindInfoRequest = 26354u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleChangeUnlockNotify = 26358u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayWeeklyEndNotify = 26360u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtSetTimerInfoResponse = 26365u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeSeasonRewardReceiveResponse = 26366u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamChallengeRequest = 26370u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueResultNotify = 26373u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallItemUseRequest = 26379u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolChangeDirRequest = 26382u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassiveSkillNotify = 26386u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterBoomPush = 26387u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeOccupationNotify = 26393u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSettingBatchUpdateRequest = 26395u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialReChallengeResponse = 26407u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomAutoPutRequest = 26414u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TurntableTaskUpdateNotify = 26417u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateEnterInfoNotify = 26418u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheckGearRequest = 26428u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FollowDetectionTargetUpdateNotify = 26429u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailBindInfoResponse = 26430u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleEvolveResponse = 26438u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelSequenceFrameEventActionResponse = 26441u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSlotCardSkillResponse = 26443u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatMessagePrefixInfoResponse = 26444u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyNextBoardRequest = 26450u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressRepeatedTaskResponse = 26458u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleGamerStatusInfoNotify = 26461u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceVoteRequest = 26463u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDealCardNotify = 26464u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleTrackReportRequest = 26465u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PassPortalRequest = 26467u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustTraceRequest = 26469u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderApplyBuffNotify = 26471u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreProgressResponse = 26475u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RunTurntableActivityResponse = 26481u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayGachaResponse = 26482u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeControlRoleNotify = 26484u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballUpdateNotify = 26492u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenTaskRewardRequest = 26496u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BoardCanMovePlacementNotify = 26498u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockSplitHumanChangleNotify = 26500u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBuffProducerOperateRequest = 26503u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSettingUpdateRequest = 26506u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DetectionInvisibleNotify = 26507u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailBindRewardRequest = 26509u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeLastInfoRequest = 26510u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DrownNotify = 26523u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerPsnBlockListResponse = 26528u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlBagOperateResponse = 26530u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlSaveMatchBriefNotify = 26533u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchExecuteSkillPlayResponse = 26537u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaPoolDetailResponse = 26540u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsBulletScreenResponse = 26542u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFinishActionResponse = 26546u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassRecurringTakeRequest = 26547u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoSellWeaponRequest = 26554u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveInstanceTimerRequest = 26557u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerHeadRequest = 26575u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    IllustratedReadRequest = 26576u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleOperateSelfBgmResponse = 26577u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardAttrInfoNotify = 26580u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryScoreRewardResponse = 26582u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ButtonIsEnableRequest = 26588u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShieldUpdateNotify = 26592u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSkillTeleportRequest = 26598u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AlertAreaNotify = 26602u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignPhotoRewardResponse = 26603u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomInteractionSkinChangeRequest = 26605u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPosAbnormalRequest = 26606u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockMarkNotify = 26611u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeGainDataUpdateNotify = 26618u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonTargetRewardResponse = 26623u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateFightRoleRequest = 26624u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveInstanceTimerNotify = 26626u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiBlackboardCdNotify = 26627u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyJoinWorldRequest = 26630u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimePointRewardActivityConditionNotify = 26647u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementInfoResponse = 26649u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TotalTopUpRewardNotify = 26650u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRoleInfoUpdateNotify = 26654u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonActivityRewardRequest = 26656u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationAttrNotify = 26658u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HoldWeaponPush = 26659u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvignonTaskNotify = 26663u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyInstInfoNotify = 26665u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingSettleResponse = 26669u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowerPollutionResponse = 26670u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDecalTaskResponse = 26679u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SyncSceneTimeNotify = 26685u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWhiteCatDataUpdateNotify = 26688u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalDestroyResponse = 26691u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreLevelNotify = 26692u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelTowerDailyTaskRewardRequest = 26699u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaResultNotify = 26700u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityActiveResponse = 26702u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleIllustratedInfoRequest = 26704u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeletePhantomEquipGroupResponse = 26711u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerAccessRangeRequest = 26712u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LongShanScoreRewardResponse = 26718u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestFinishActionRequest = 26719u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignDrawRoleRequest = 26720u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsGearResponse = 26722u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledShowResponse = 26724u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CorniceMeetingRewardRequest = 26725u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillViewRequest = 26728u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldEnterPermissionsResponse = 26732u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThroughTrainResponse = 26744u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerSeasonScoreRewardRequest = 26749u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterAttributeNotify = 26755u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoSyncEntityDealDamagePush = 26756u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeSummonEntityStateRequest = 26759u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSettingRequest = 26762u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerUpdateRecordRequest = 26763u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlChallengeUnlockNotify = 26771u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopUnlockNotify = 26780u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantActivityNodeActiveNotify = 26790u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayGiftInfoRequest = 26799u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommonOrganActionListNotify = 26803u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HoldHandResponse = 26804u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessUseSkillResponse = 26805u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CorniceChallengeTransResponse = 26808u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateChangedRequest = 26812u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2InfoNotify = 26813u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingQuickSellResponse = 26816u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassResponse = 26818u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsOpDoneRequest = 26819u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BathPhotoRequest = 26824u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEntitySubTypeChangeNotify = 26830u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitAwakeAndLoadEntityNodeRequest = 26833u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityAccessCasketRequest = 26836u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddGuestNotify = 26842u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaDiscountNotify = 26843u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemAiEnableNotify = 26846u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StopMoveSplineRequest = 26851u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityInstInfoNotify = 26859u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemStopRequest = 26861u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThrowDamageResponse = 26863u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BatchSynthesisItemRequest = 26865u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PressResponse = 26869u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldLevelNotify = 26870u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheatInputRequest = 26873u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GmVoxelInfoNotify = 26875u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmRankListResponse = 26876u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorUseSkinRequest = 26877u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayInstShareFirstInfoNotify = 26879u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseAuxiliaryResetResponse = 26880u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTalentLevelUpRequest = 26893u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ArtemisNodeUpdateResponse = 26895u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HoldHandRequest = 26904u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotographPush = 26905u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TutorialUnlockRequest = 26906u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BookItemUpdateNotify = 26909u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulPhantomBattleMasterLevelRewardRequest = 26911u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrInfoRequest = 26916u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropCatchInfoResponse = 26922u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorActiveNotify = 26927u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CancelMatchRequest = 26931u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityStaticHookMoveNotify = 26938u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingBoatDieNotify = 26943u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyGotoNextRoomResponse = 26948u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueChooseDataNotify = 26956u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballWeaponWearRequest = 26957u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientPullResourcePackageRequest = 26961u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballInGameKickBallResponse = 26970u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeletePhantomEquipGroupRequest = 26973u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TutorialInfoResponse = 26976u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingHandInRequest = 26983u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDecalUpdateNotify = 26984u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrampleGearTransitionNotify = 26985u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExecuteQteResponse = 26990u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2LevelUpResponse = 26991u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillPullGiantRequest = 26996u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationAttrResponse = 26997u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightOneKeyRewardResponse = 26998u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryResidentTaskRewardRequest = 27008u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBvBFightNotify = 27009u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientVersionNoMatchNotify = 27011u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseUseItemResponse = 27014u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleFourCTaskInfoUpdateNotify = 27016u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkSettleResponse = 27018u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTideSwitchVisionRequest = 27020u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerXboxInfoGetResponse = 27026u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulCalabashLevelRewardRequest = 27027u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsStepUpdateNotify = 27029u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryEquipRoleRequest = 27034u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookTaskRewardResponse = 27039u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageChatThemeChangeRequest = 27042u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    YuXueModeInfoNotify = 27043u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchRewardMilestoneResponse = 27049u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbRoleActiveNotify = 27050u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeStateConfirmRequest = 27052u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetFocusModeDeterCondRequest = 27054u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorNewQuestUpdateNotify = 27058u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLimitTaskRewardResponse = 27065u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenTaskRewardResponse = 27072u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmSetRedDotResponse = 27076u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldLevelDownResponse = 27079u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressRepeatedTaskRequest = 27083u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponItemResponse = 27089u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingItemAddNotify = 27090u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LobbyListRequest = 27091u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiInformationRequest = 27094u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeStateResponse = 27097u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlRoundSwitchNotify = 27098u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillPullGiantResponse = 27102u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDevelopTaskRewardRequest = 27103u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestFinishActionRequest = 27112u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResFovUpdateNotify = 27113u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTideBagSortResponse = 27116u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JoinSceneNotifyConfirmRequest = 27120u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestScoreRewardResponse = 27124u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreToolAllNotify = 27129u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MovePlacementResponse = 27133u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerStartRequest = 27135u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionFinishRequest = 27144u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyQuestChangePreferResponse = 27145u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetBtObjYuXueModeResponse = 27148u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleStateChangeResponse = 27150u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneSubLevelsResponse = 27152u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueQuitResponse = 27155u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpecialItemUnEquipResponse = 27162u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CharacterDeathRequest = 27163u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyTaskRewardResponse = 27164u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlScoreRewardResponse = 27166u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OccupationInfoNotify = 27173u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushTaskRewardRequest = 27175u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResetQuestFocusModeNotify = 27177u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RefreshBuffDurationPush = 27178u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimerEndResponse = 27179u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicSwitchRequest = 27185u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeleteStoryCharacterRequest = 27194u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportTrialRoleLvUpRequest = 27199u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBuffProducerOperateResponse = 27203u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityBeamReceiveRequest = 27206u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponResonUpRequest = 27212u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InviteRechallengeRequest = 27217u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RhythmChangePartnerRoleRequest = 27219u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignSkinRewardResponse = 27228u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopDirectBuyNotify = 27230u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtSuspendNotify = 27231u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoFightSettleRequest = 27242u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ZitherPlayNotePush = 27243u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBackSlotCardLibraryRequest = 27245u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerCycleStartResponse = 27252u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeadeyeShootHitRequest = 27253u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstFightEndPush = 27255u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScheduleNpcUpdatePosResponse = 27257u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookDeletePresetRequest = 27258u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueArchiveSaveResponse = 27259u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderApplyBuffResponse = 27266u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseRefreshGainingGroupRequest = 27268u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatOperateRequest = 27275u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientCurrentRoleReportRequest = 27281u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardRoleTargetInfoResponse = 27282u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallTeleportToMarkIdRequest = 27287u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CompleteMarkNotify = 27290u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LobbyQueryPlayersRequest = 27293u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomVicePolishResponse = 27294u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssRoleInfoUpdateNotify = 27295u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceRecallQuestResponse = 27297u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecGetReportData2FlowResponse = 27302u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationSwitchRoleRequest = 27304u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrnamentInfoNotify = 27306u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightAddBuffNotify = 27308u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanSaveUsePlanRequest = 27330u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecGetReportData2FlowRequest = 27333u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CdKeyVerifyRequest = 27335u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NpcTraceFailedRequest = 27353u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CharacterMoveToPointNotify = 27358u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyQuestUnlockAreaNotify = 27366u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LanguageSettingUpdateResponse = 27367u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EdgeRunnerScoreRewardResponse = 27370u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTechLevelUpResponse = 27374u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryPickUpItemResponse = 27375u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatBeginNotify = 27378u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SummonRequest = 27379u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRefreshSubLevelNotify = 27381u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlShopRefreshRequest = 27387u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowRestartResponse = 27398u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailGetAttachmentResponse = 27409u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceInstanceInfoUpdateNotify = 27413u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PackAnimChangedNotify = 27418u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageShowChangeRequest = 27422u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoonPhaseRandomResponse = 27423u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CiacconaActivityStateUnlockUpdateNotify = 27426u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyBoardRewardRequest = 27429u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseCurChallengeInfoRequest = 27431u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsLegMatchInfoRequest = 27433u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerXboxSessionNotify = 27434u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PartComponentInitNotify = 27435u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleDealCardReplaceNotify = 27437u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceSetResponse = 27439u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WaitQuestConfirmResourceNotify = 27440u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MobileButtonSettingUpdateResponse = 27442u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowTeleportToPlotPosResponse = 27445u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AtomicProcessTeleportResponse = 27447u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterAttributeArrayNotify = 27454u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillBranchModifyRequest = 27456u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingPortUpdateNotify = 27457u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveActivityScoreRequest = 27461u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsComboParamUpdateNotify = 27463u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerClearRecordResponse = 27464u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolStopRequest = 27475u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeeklyFrameworkInfoUpdateNotify = 27476u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTaskTakeRequest = 27478u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerNetStateS2cNotify = 27482u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConfirmQuestResourceRequest = 27492u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityStaticHookMovePush = 27494u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryLimitShopConsumeNumNotify = 27498u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerTeleportStateNotify = 27500u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashSkinTakeOnNotify = 27504u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayRemoveUnitResponse = 27510u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSellRequest = 27511u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleShowListUpdateNotify = 27519u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterPatrolPointReachedRequest = 27527u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetFanNumberOfTurnsResponse = 27529u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TopPhantomEquipGroupResponse = 27536u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityCameraAlertRequest = 27538u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddChapterResultResponse = 27547u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayRefreshGachaResponse = 27548u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeDataLayerFinishRequest = 27553u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstDataNotify = 27555u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SignActivityRequest = 27564u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AtomicProcessRemoveBuffRequest = 27565u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockResetGamePlayNotify = 27566u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchCharacterStateRequest = 27567u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuildingBranchRequest = 27569u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestInstRewardRequest = 27572u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRankListSelfDataResponse = 27580u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThirdPartyShareRequest = 27585u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BirthdayShowSetRequest = 27587u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballUpdateWaveNotify = 27589u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingIllustratedRewardInfoUpdateNotify = 27592u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MowTowerLevelsRewardRequest = 27598u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackSwordChallengeMarkItemPanelInfoRequest = 27609u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThemeWorldScoreRequest = 27613u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballInGameStateChangeNotify = 27614u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerReviveNotify = 27617u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssPluginItemAddNotify = 27619u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingIllustratedRewardResponse = 27625u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnableNearbyTrackingNotify = 27628u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignDrawRoleResponse = 27629u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangePlayerFightRoleNotify = 27633u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetAdventureRewardRequest = 27637u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConfirmResourceQuestNotify = 27650u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateInitNotify = 27651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SignActivityFreeDropResponse = 27652u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    H5CircumFluenceActivityReadResponse = 27658u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsLastInfoRequest = 27662u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FurnitureDiySaveResponse = 27663u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterBoomRequest = 27664u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterLevelArrayNotify = 27665u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerDeadNotify = 27670u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTrialRoleGetNightmarePhantomInstInfoResponse = 27671u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeatherControlResponse = 27673u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResMoveResponse = 27678u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopItemUpdateResponse = 27686u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymInfoResponse = 27687u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecWorldStartFlowResponse = 27691u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateOwnerMingSuGenNotify = 27693u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayWeeklyNotify = 27695u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStorySetFormationNotify = 27708u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemDecomposePreviewRequest = 27713u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetTraceQuestYuXueModeRequest = 27714u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityCameraAlertResponse = 27719u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeResultNotify = 27722u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingGhostStateNotify = 27726u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayTributeRequest = 27731u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulRoguelikeWriteCatRewardRequest = 27734u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HardnessModeChangedResponse = 27736u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResEndingUpdateNotify = 27739u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomReturnPreviewResponse = 27740u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TotalTopUpActivityInfoNotify = 27743u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeSceneModeEndNotify = 27746u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WorldBlackboardNotify = 27748u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorInfoResponse = 27754u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorCreateResponse = 27756u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TemplateEntitySpawnerContentNotify = 27757u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoEndShopStepResponse = 27759u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerMonsterHpInfoNotify = 27762u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveForbidControlNotify = 27763u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommonOrganResetTimeRequest = 27765u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoonPhaseRewardRequest = 27767u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseRefreshShopResponse = 27769u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantSystemInfoNotify = 27770u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VisionSkillCallNotify = 27773u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HitNotify = 27776u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerLevelUnlockNotify = 27780u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ForgeItemResponse = 27784u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SwitchLogicStatePush = 27786u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChatRequest = 27797u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantEcoUnlockNotify = 27800u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseCurChallengeInfoResponse = 27808u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerCreateXboxSessionRequest = 27825u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttributeChangedNotify = 27832u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TetrisFinishResponse = 27836u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingActivityMilestoneRewardResponse = 27837u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveTreasureBoxSlotResponse = 27840u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BatchMaterialReplaceResponse = 27844u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BehaviorTreeDeleteNotify = 27847u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenInfoUpdateNotify = 27851u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionResetPosPrePerformanceEndResponse = 27855u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BulletPatternPush = 27859u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreToolUpdateNotify = 27860u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingExitRequest = 27861u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiInformationNotify = 27868u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchRewardMilestoneRequest = 27873u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssPluginPutResponse = 27879u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2ManualSwitchTraceTreeRequest = 27880u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleSlotInsteadResponse = 27889u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEndNotify = 27894u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressTrialRoleLvUpRequest = 27895u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessRefreshNotify = 27908u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MutiplayerTeamRefreshNearListRequest = 27911u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseDevelopInfoUpdateNotify = 27912u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryUnlockSlotResponse = 27913u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneAreaStateNotify = 27914u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerFollowerNotify = 27918u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapMarkResponse = 27926u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnblockPlayerResponse = 27927u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlSettleResponse = 27928u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RealmBetweenFullRewardRequest = 27929u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportActivityTaskUpdateNotify = 27935u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtRollbackRequest = 27940u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanFindPlanResponse = 27942u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiHateRequest = 27946u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateNodeProgressNotify = 27949u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityIsVisibleResponse = 27951u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamTeleportStartNotify = 27952u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeOrnamentRequest = 27956u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoRefineWeaponRequest = 27957u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeDataLayerFinishResponse = 27963u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceEndNotify = 27964u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeGiveUpGainRequest = 27974u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FsmConditionPassResponse = 27979u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRoleRoomSelectResponse = 27983u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BehaviorTreeInfoNotify = 27985u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TransformBuffStackNotify = 27991u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbRoleExpNotify = 27992u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneLoadingTimeOutNotify = 27994u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlActivityLimitCoinUpdateNotify = 27996u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeeklyFrameworkScoreRewardRequest = 28000u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanUpdatePlanRequest = 28006u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterViewDirectionPush = 28007u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DecalRemoveNotify = 28009u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringFestivalAtmosphereRewardResponse = 28012u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEntityDieResponse = 28019u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchRewardTaskResponse = 28020u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerGuideActivityRewardRequest = 28023u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExchangeRewardInfoResponse = 28025u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlashAndTowerScoreRewardRequest = 28028u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlScoreRewardRequest = 28029u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateTimerInfoNotify = 28030u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeEntityStateResponse = 28032u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeWriteCatRewardResponse = 28034u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchInfoRequest = 28035u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShowInvalidItemRequest = 28036u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballRoleLevelUpResponse = 28040u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemGiftUseNotify = 28048u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecFBRoundEndFlowReportResponse = 28053u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    Summon2Response = 28056u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeStartResponse = 28058u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HitEndResponse = 28059u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddMarkInfoNotify = 28060u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeMonsterRoleNotify = 28069u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2ManualSwitchTraceTreeResponse = 28071u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveGameplayEffectResponse = 28077u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonsterDetectionInfoRequest = 28081u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleReconstructCardRequest = 28082u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTowerSeasonRewardResponse = 28087u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideTriggerRequest = 28091u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SneakRequest = 28095u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HostFogIdUnlockNotify = 28107u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveMatchTeamRequest = 28110u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatValNotify = 28115u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomCollectUpdateNotify = 28121u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneBlockSplitHumanFullNotify = 28122u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MingSuHandRewardRequest = 28128u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PartUpdateResponse = 28131u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorExpAddNotify = 28144u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleMotionUnLockResponse = 28146u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HookLockPointExitRequest = 28147u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceRecallQuestRequest = 28149u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorCycleCruiseStatePush = 28153u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeaponLevelUpRequest = 28155u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomItemUpdateNotify = 28162u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThrowDamageRequest = 28170u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActionOpenSystemBoardNotify = 28172u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SplinePositionUpdateRequest = 28181u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EquipTakeOnResponse = 28184u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseBuildingLevelUpResponse = 28185u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingShipForceBackNotify = 28191u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBadgeRewardResponse = 28194u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterMatchTeamNotify = 28195u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleChangeNotify = 28197u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuildingLevelUpRequest = 28202u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    H5ViewActivityReadRequest = 28203u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopAnimRequest = 28204u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulRogueWeeklyRewardRequest = 28205u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestBuffUnlockRewardRequest = 28209u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTrialRoleInfoResponse = 28212u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivateBuffNotify = 28221u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CookFoodRequest = 28222u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewPlayerSupportSetCurUseTrialRoleV2Response = 28224u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MixDrinkRoleInviteResponse = 28226u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledNotify = 28228u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetDetectionTargetRequest = 28235u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueLootInfoRequest = 28236u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSkillResponse = 28239u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldResultResponse = 28241u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulMapTravelSoarRewardResponse = 28256u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorListRequest = 28257u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifyEntityCampNotify = 28258u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScheduleNpcUpdatePosRequest = 28259u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryTalentInfoUpdateNotify = 28280u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchRoundActionRequest = 28283u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetFanNumberOfTurnsRequest = 28291u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ForgeInfoResponse = 28293u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConstructTrapResponse = 28302u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassLevelUpRequest = 28304u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimeCheckRequest = 28306u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SelectDetectionTargetRequest = 28315u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PressNotify = 28317u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailReadResponse = 28318u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTraceInfoResponse = 28319u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressSetCurUseTrialRoleRequest = 28325u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimelineTraceControlResponse = 28330u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateInitResponse = 28333u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseTechUpdateNotify = 28334u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveOccupationInfoNotify = 28337u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassRequest = 28338u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityResultRewardResponse = 28339u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GetRewardTreasureBoxResponse = 28349u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TutorialUnlockNotify = 28355u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneGamePlayFirstNotify = 28356u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushLevelScoreRewardResponse = 28357u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessResponse = 28359u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EncircleChallengeStartResponse = 28360u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveSceneNotify = 28361u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreActivityTaskRewardRequest = 28364u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveInstRequest = 28370u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomRecommendResponse = 28376u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestStateUpdateNotify = 28378u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaPoolDetailRequest = 28380u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalDieNotify = 28384u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BrochureRewardRequest = 28387u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayTagChangedNotify = 28388u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsRankResponse = 28404u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FormationChangeRequest = 28405u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushResultNotify = 28412u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehiclePlatformGetOnResponse = 28415u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChapterUpdateNotify = 28416u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldLevelPlayRequest = 28418u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeTokenReceiveResponse = 28422u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomPolishRequest = 28425u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomUpdateNotify = 28427u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DieSwitchRoleNotify = 28430u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardOutLookUpRequest = 28432u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsRepeatedTaskRewardRequest = 28433u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityLevelInfoNotify = 28436u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetClientGlobalVarRequest = 28443u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiHateResponse = 28446u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorDevelopTaskRewardResponse = 28453u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRoleUpdateNotify = 28456u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrialRoleRewardRequest = 28460u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdviceDeleteResponse = 28461u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueRefreshGainResponse = 28469u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayItemRequest = 28472u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemBlackboardNotify = 28473u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementCountChangeNotify = 28476u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityActiveRequest = 28481u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorExpTipsNotify = 28482u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResChangeFormationRequest = 28484u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackCoastThemeTaskRewardResponse = 28490u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOnlineRankRuleIdsNotify = 28493u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterAreaRequest = 28495u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScratchCardRewardRequest = 28502u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadNetworkEntityStartNavNotify = 28503u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BeControlledThrowResponse = 28508u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefensePreviewStartNotify = 28509u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSellPreviewResponse = 28511u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DirectTrainInfoResponse = 28515u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PayShopDirectBuyRequest = 28521u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SplinePositionNotify = 28528u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DirectTrainInfoNotify = 28529u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanBatchOperRequest = 28530u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GatewayEchoRequest = 28532u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbRolePropsNotify = 28533u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryAreaTaskInfoRefreshNotify = 28536u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOnlineRankSnapshotNotify = 28537u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CheckPublicResourceVersionRequest = 28539u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoSystemInfoNotify = 28540u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CdKeyVerifyResponse = 28544u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlTaskUpdateNotify = 28545u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConsumptiveRewardRequest = 28551u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulMapTravelSoarRewardRequest = 28556u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResSwitchFormationRequest = 28562u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightSettleResponse = 28563u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockSwitchControlBlockResponse = 28564u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolySceneGridInfoNotify = 28572u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsGearRequest = 28576u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsUpdateOddsRequest = 28583u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseChallengeUpdateNotify = 28586u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseGainingGroupUpdateNotify = 28590u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResOpDataNotify = 28593u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhotoMemoryUpdateNotify = 28595u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsPlayerInfoResponse = 28603u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScratchCardActivityInfoRequest = 28606u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResIllustrationAwardRequest = 28613u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OutputDebugInfoRequest = 28615u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyDiceRequest = 28626u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2ManualCancelTraceTreeResponse = 28628u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueRoomInfoNotify = 28630u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WeeklyFrameworkScoreRewardResponse = 28631u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AllApplyJoinNotify = 28635u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TimePointActivityRewardResponse = 28642u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestReviewInfoNotify = 28644u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushFailResultNotify = 28650u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomFormationChangeNotify = 28651u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecFBRoundEndFlowReportRequest = 28654u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerXboxBlockListRequest = 28660u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleMasterLevelRewardRequest = 28662u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustRefreshResponse = 28664u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstEntityTeleportResponse = 28666u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchSettleRequest = 28679u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WellStreamingFinisResponse = 28686u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JokerGuessStartNewRequest = 28688u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlagChallengeUnlockTeleporterNotify = 28693u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingTeleportToBoatRequest = 28699u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BlackCoastThemeActiveRewardResponse = 28700u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressBuyBonusLvResponse = 28709u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AceAntiDataNotify = 28711u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InteractQuestSuspendEntityNotify = 28715u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallItemUseResponse = 28729u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulCorniceMeetingRewardRequest = 28733u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChapterResultRewardResponse = 28736u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerGravityUpdateNotify = 28738u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SpringSignDrawRewardResponse = 28746u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityResultNotify = 28748u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbRoleScenePropsNotify = 28749u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightTalentTreeUpdateNotify = 28750u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryActivateTalentResponse = 28751u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityEnterVehicleResponse = 28752u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeResultResponse = 28757u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EquipTakeOnNotify = 28760u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorUnLockRequest = 28764u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiBlackboardCdRequest = 28767u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookDeletePresetResponse = 28770u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecallQuestFinishActionResponse = 28795u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AbyssShowNameRequest = 28814u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballQuitRequest = 28824u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorIsEnablePush = 28828u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTechTreeSwitchRequest = 28833u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SlowTimePush = 28835u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsPlayerInfoUpdateNotify = 28840u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LinkingStateNotify = 28844u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SheriffZoneItemUpdateNotify = 28846u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeCardResponse = 28852u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestSettleResponse = 28863u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattlePassTakeAllRewardResponse = 28865u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SeamlessTeleportRequest = 28869u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddReviveRegionResponse = 28871u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingEntrustAcceptResponse = 28877u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterLevelPlayNotify = 28880u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaInfoRequest = 28888u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfrV2TreeBuildResponse = 28890u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueBlessGroupSelectNotify = 28895u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffItemUpdateNotify = 28896u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayRewardNotify = 28898u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendAddedNotify = 28906u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstanceTimerNotify = 28918u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseTechUnlockRequest = 28920u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceInstanceRewardRequest = 28922u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RegressSetCurUseTrialRoleResponse = 28925u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SecFBRoundStartFlowRequest = 28936u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryEquipRoleResponse = 28938u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayTagResponse = 28943u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CombatDataMaxNotify = 28947u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerGameTokenResponse = 28955u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MatchThreeEndResponse = 28958u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DamageExecuteNotify = 28964u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldLevelDiffRequest = 28967u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CoopRoleInfoUpdateNotify = 28969u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivityItemNumUpdateNotify = 28972u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceQuestRequest = 28978u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShopUpdateResponse = 28984u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSkillFailResponse = 28988u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RenjuResetResponse = 28995u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PbOverRoleResponse = 29016u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    JoinSceneNotifyConfirmResponse = 29017u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PolluteGridCellResponse = 29018u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieMainTaskUpdateNotify = 29029u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTideItemMarkResponse = 29034u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ScratchCardCountInfoNotify = 29035u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulFishingIllustratedRewardResponse = 29037u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PartUpdatePush = 29042u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreSkillCustomResponse = 29046u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InitRangeRequest = 29050u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityHonamiStoryEnhanceLevelNotify = 29068u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomReturnPreviewRequest = 29070u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleLogNotify = 29071u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageShowChangeResponse = 29072u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AttributeInitResponse = 29079u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ModifyNameResponse = 29083u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ParkourChallengeResponse = 29088u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DailyQuestGetRewardRequest = 29092u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InputSettingUpdateResponse = 29097u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RemoveTemporaryTeleportRequest = 29103u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BathChangeCameraRequest = 29105u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimalDropRequest = 29107u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BulletPatternNotify = 29108u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymLevelPlayResultNotify = 29109u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SimpleCombatEntitySyncAttributePush = 29113u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchOperRequest = 29114u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityPointNotify = 29118u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConnectorConnectEntityRequest = 29122u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewBieCourseRewardRequest = 29127u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    StopHoldHandNotify = 29128u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActiveDragonPoolResponse = 29130u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingCompleteRequest = 29131u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikePopularEntriesInfoRequest = 29132u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ClientBasicInfoResponse = 29135u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InputSettingUpdateRequest = 29143u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityLoadCompleteNotify = 29145u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsTalentLevelUpRequest = 29153u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EndSkillResponse = 29159u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SurvivorsNormalAwardRequest = 29160u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyBlackFlowerResponse = 29161u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestBranchRequest = 29163u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExploreEntityTraceRequest = 29165u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballSetPayloadRequest = 29166u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlItemUnlockNotify = 29171u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockInstEntranceResponse = 29172u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NormalItemRemoveNotify = 29178u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkTideExtraBagSyncNotify = 29192u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopResponse = 29193u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSceneItemBlackboardResponse = 29196u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageItemUpdateNotify = 29198u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoGoldAddRequest = 29200u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CommonUiSettingNotify = 29215u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitAwakeAndLoadEntityNodeResponse = 29216u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightRefreshCollectionResponse = 29219u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FlowSeqSetPlayerPosResponse = 29220u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NetTestDataResponse = 29222u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightTalentUpRequest = 29225u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResetSpecialBonusNotify = 29227u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActivityPayShopBuyRequest = 29230u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceChallengeQuitRequest = 29237u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LifePointChallengeStartResponse = 29239u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SplinePositionUpdateResponse = 29241u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklySubLevelNotify = 29246u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulAchievementReceiveResponse = 29250u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonConditionNotify = 29252u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    OrderRemoveBuffRequest = 29255u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GuideGroupResetNotify = 29256u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MovePlacementNotify = 29257u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomMusicCollectUpdateResponse = 29261u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlaceItemOnBoardRequest = 29265u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ExecuteQteRequest = 29269u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LivenessTakeRequest = 29270u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingSellResponse = 29274u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneDateNotify = 29275u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HarvestActivityPointRequest = 29278u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PreheatSignRewardRequest = 29281u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingNetCabinUpdateNotify = 29286u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueTowerTrialGiveUpTempArchiveResponse = 29294u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookTaskRewardRequest = 29300u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AwakeDynamicPortalResponse = 29309u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingPortUnlockNotify = 29311u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GivebackInfoResponse = 29313u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorAcceptQuestResponse = 29317u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomPutOnRequest = 29319u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBatchDirectRefiningResponse = 29320u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CancelQuestFocusModeResponse = 29321u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InfluenceInfoResponse = 29322u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetsBulletScreenRequest = 29326u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SeamlessTeleportVehicleResponse = 29328u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeCurrencyUpdateNotify = 29332u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GolemCrackUpdateRequest = 29338u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorFightItemUpdateNotify = 29340u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleUpdateDevelopTargetRequest = 29361u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorTechTreeSwitchResponse = 29362u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BuffStackCountNotify = 29363u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSettingResponse = 29364u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerCreatePsnSessionRequest = 29372u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResFormationUpdateNotify = 29375u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DropCatchLevelRewardUpdateNotify = 29378u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddForbidControlNotify = 29379u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetQuestResourceStateRequest = 29385u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AchievementUpdateRequest = 29393u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockInputResponse = 29397u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PullingFoundationResponse = 29401u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoMonopolyDiceResponse = 29407u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChangeSceneModeNotify = 29411u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResPlayerStatusUpdateNotify = 29412u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerDefenceChallengeQuitResponse = 29413u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneRoadSyncNotify = 29415u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnrichmentAreaRequest = 29419u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleTrialCloseNotify = 29420u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapCancelTraceRequest = 29421u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemPkgOpenNotify = 29428u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFavorFinishConditionNotify = 29435u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BattleStateChangePush = 29436u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LandingDamageResponse = 29437u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelLevelUpResponse = 29440u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailReadRequest = 29441u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhBaPlanUpdatePlanResponse = 29442u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddDecalResponse = 29445u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ResonantChainUnlockResponse = 29448u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchInviteResponse = 29449u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BabelActivitySettleInfoNotify = 29450u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseRewardUpdateNotify = 29453u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RecoverPropChangedNotify = 29454u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerEnterPollutionResponse = 29461u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantModelEnableNotify = 29470u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReviveResponse = 29474u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddTemporaryTeleportRequest = 29476u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemStateRequest = 29477u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HonamiStoryWeaponDressResponse = 29480u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActorVisibleResponse = 29481u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    Summon3Response = 29484u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ApplyGameplayEffectPush = 29488u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LevelPlayerRewardHintNotify = 29490u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantTotalStableValueUpdateNotify = 29495u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchResponse = 29502u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoRefineWeaponResponse = 29507u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MoveSceneItemResetPositionResponse = 29511u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SignActivityFreeDropRequest = 29512u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleTaskRewardRequest = 29515u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueSubLevelNotify = 29516u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SkillRequest = 29518u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonthCardResponse = 29522u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSpawnMonsterWaveEndNotify = 29527u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewTrialRoleGetNightmarePhantomInstInfoRequest = 29530u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SplineMoveResponse = 29534u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleRepeatedTaskRewardResponse = 29535u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeSeasonDataResponse = 29540u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FloroRanchPlayNextDayRequest = 29541u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ElementalAbilityUpdateNotify = 29547u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityHeadInfoNotify = 29559u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapTravelTaskRewardResponse = 29561u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DangoBrawlInstPrepareNotify = 29564u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EnterAreaNotify = 29588u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EquipTakeOnRequest = 29592u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DarkCoastInfoRequest = 29597u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResLastInstInfoResponse = 29600u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FishingActivityLimitRewardRequest = 29602u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeRefreshGainRequest = 29603u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtRollbackStartNotify = 29608u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResGainDataUpdateNotify = 29611u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleEnterSharingResponse = 29612u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AiControlSwitchNotify = 29617u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueBlackFlowerRequest = 29618u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RollBlockResetGamePlayResponse = 29620u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AdventureManualDataRequest = 29621u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TowerApplyFloorDataResponse = 29629u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomSkinChangeResponse = 29630u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BoardGridDynamicConfigChangeNotify = 29632u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResMoodRangeUpdateNotify = 29633u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrapDefenseSlotUpdateRequest = 29634u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MaterialNotify = 29636u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MailAddNotify = 29640u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueShopBuyResponse = 29643u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    NewbieCarnivalTaskDataUpdateNotify = 29644u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LordGymReadRequest = 29647u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MultiMapInfoNotify = 29652u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UpdateSysBuffNotify = 29655u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GachaAccumulateRewardRequest = 29657u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueInstExtraInfoResponse = 29662u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoLimitTaskReceiveRequest = 29669u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AreaTerminalPinOperationRequest = 29677u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WuWuPackageRewardRequest = 29680u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResInstOptionsUpdateNotify = 29683u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseDetectionSkillResponse = 29685u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TraceQuestResponse = 29698u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FragileChangeRequest = 29703u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    LeaveMatchTeamResponse = 29714u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GameplayCueNotify = 29715u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SubmitPhotoNodeResponse = 29717u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PrivateChatHistoryResponse = 29725u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueResourcesUpdateNotify = 29726u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    HoldWeaponNotify = 29731u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResCurrencyNotify = 29732u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThirdPartyShareResponse = 29740u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeamMatchFlagNotify = 29741u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FriendDeleteResponse = 29748u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RacingBetMatchRoundResponse = 29752u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AccessPasserbyNpcSpawnerRequest = 29764u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AvignonRewardResponse = 29765u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AddTreasureBoxSlotResponse = 29769u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueArchiveListRequest = 29771u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemDisuseResponse = 29774u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomItemRemoveNotify = 29775u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DodgeInfoPush = 29777u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleSkillQuickLevelUpRequest = 29779u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UseSoundBoxSkillResponse = 29780u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DeleteStoryCharacterResponse = 29781u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TrackMoonRoleDataResponse = 29783u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoguelikeStartRequest = 29795u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossPilingTaskInfoUpdateNotify = 29797u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RTimeStopInstResponse = 29799u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BossRushClaimRewardRequest = 29802u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ItemPkgFullNotify = 29804u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueResTeamLevelUpdateNotify = 29805u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FarmGoldResultRequest = 29811u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerTitleInfoUpdateNotify = 29816u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyLastInfoRequest = 29824u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    QuestGiveUpNotify = 29826u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MotorOutlookOwnedChangeNotify = 29827u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CorniceChallengeTransRequest = 29837u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SetQuestFocusModeRequest = 29838u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomRefiningResponse = 29840u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AcceptFocusWaitQuestRequest = 29846u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PinballTeamReviveRequest = 29847u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    DollGrabPauseEndResponse = 29848u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemMoveSplineResponse = 29851u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    FinishDownloadQuestResourceRequest = 29854u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoadBookMotorRewardRequest = 29858u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RiskHarvestInstRewardResponse = 29859u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ActiveDragonPoolRequest = 29864u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomAttrRecommendRequest = 29865u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    GiantStableValueActivityResponse = 29866u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CreateBulletNotify = 29868u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoleFlyEquipNotify = 29874u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleBackLibraryResponse = 29876u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ReceivedSilentFirstAwardRequest = 29881u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ThrowDamageNotify = 29882u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    WuWuTaskRewardResponse = 29886u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    UnlockHeadPhotoNotify = 29887u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    KurotatoLevelRecordDeleteResponse = 29888u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TriggerExitSkillRequest = 29898u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityPatrolStartRequest = 29907u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityInteractResponse = 29908u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MonthCardUseNotify = 29912u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    TeleportTransferRequest = 29918u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MapCancelTraceResponse = 29919u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PlayerVoiceLanguageRequest = 29926u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleCardGroupDeleteResponse = 29932u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AnimationStateInitPush = 29933u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RogueWeeklyArtifactInfoRequest = 29939u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    EntityInteractingNotify = 29944u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InstSaveDataNotify = 29945u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    RoverRogueEventSelectResponse = 29946u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ConnectorCanConnectResponse = 29950u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChannelChatMessageNotify = 29952u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ShortMessageChatCharmChangeRequest = 29957u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    SceneItemAiDisableNotify = 29959u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    BtRollbackNotify = 29964u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    ChatNotify = 29969u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    VehicleRequest = 29971u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    PhantomBattleFourCTaskDealCardNotify = 29973u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    MulMapTravelTaskRewardRequest = 29978u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    InspirationUnlockChoiceRequest = 29979u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    AcceptEntrustResponse = 29986u16,
    #[allow(non_camel_case_types, non_upper_case_globals)]
    CalabashSkinTakeOnResponse = 29991u16,
}
