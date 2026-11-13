// v4 schema: our additions to the API at layer 232.
//
// This file is appended to the upstream schema at layer 232. Nothing here changes an upstream
// constructor: every declaration is new, and some new constructors join an upstream type
// (marked "joins"). Each declaration carries its constructor id, by upstream's rule: the CRC32 of
// the declaration with `bytes` read as `string`, `Vector<T>` as `Vector T`, braces dropped and
// `?true` flag fields left out (v4-follow-up-4-backend.md).
//
// The v4 contract explains each section: v4-server-backend.md and the parts it lists.

// ===== Posts (v4-posts-backend.md) =====

post#57d5536c flags:# out:flags.0?true pinned:flags.1?true edited:flags.2?true noforwards:flags.3?true bookmarked:flags.4?true archived:flags.5?true draft:flags.6?true min:flags.7?true silent:flags.25?true id:long from_id:Peer date:int reply_to:flags.8?PostRef text:flags.9?string entities:flags.10?Vector<MessageEntity> media:flags.11?Vector<MessageMedia> place:flags.12?PostPlace rating:flags.13?int attachments:flags.14?Vector<PostAttachment> topic_id:flags.15?long privacy:flags.16?Vector<PrivacyRule> reply_privacy:flags.17?PostReplyPrivacy replies_count:flags.18?int shares_count:flags.19?int reactions:flags.20?MessageReactions views:flags.21?PostViews ttl_period:flags.22?int edit_date:flags.23?int new_topic_title:flags.24?string schedule_error:flags.26?string = Post;
postDeleted#e46e42b0 id:long = Post;

postRefPost#579487a9 id:long = PostRef;
postRefStory#bc48b926 flags:# peer:Peer story_id:int story:flags.0?StoryItem = PostRef;
inputPostRefPost#7f433cd8 id:long = InputPostRef;
inputPostRefStory#bd859746 peer:InputPeer story_id:int = InputPostRef;

// joins MessageEntity: v3's highlight and font size, which upstream has no entity for
messageEntityHighlight#793b26a3 offset:int length:int color:string = MessageEntity;
messageEntityFontSize#b7f716b1 offset:int length:int size:string = MessageEntity;

// joins MessageMedia and InputMedia: a post shared into a post or a chat
messageMediaPost#b44e89dc flags:# post_id:long post:flags.0?Post = MessageMedia;
inputMediaPost#d6029fc5 id:long = InputMedia;

postPlace#1922c8a4 flags:# geo:GeoPoint title:string address:string city:flags.0?string region:flags.1?string venue_type:string = PostPlace;
inputPostPlace#122f0a8c flags:# geo:InputGeoPoint title:string address:string city:flags.0?string region:flags.1?string venue_type:string = InputPostPlace;

postAttachmentBook#77924d7c flags:# id:string title:string authors:Vector<string> cover:flags.0?WebDocument = PostAttachment;
postAttachmentMovie#e24152cf flags:# id:string title:string year:string poster:flags.0?WebDocument = PostAttachment;
postAttachmentMusic#fe974fe4 flags:# id:string title:string performer:string album:string artwork:flags.0?WebDocument preview:flags.1?WebDocument = PostAttachment;
inputPostAttachment#23b7afb3 query_id:long id:string = InputPostAttachment;

postReplyPrivacyEveryone#1b61d47f = PostReplyPrivacy;
postReplyPrivacyFollowers#caf147ae = PostReplyPrivacy;
postReplyPrivacyMentioned#a90032a7 = PostReplyPrivacy;
postReplyPrivacyNobody#3514d583 = PostReplyPrivacy;

postViews#6437ea14 flags:# views_count:int recent_viewers:flags.0?Vector<long> = PostViews;
postViewer#a95f5d5d flags:# user_id:long date:int reaction:flags.0?Reaction = PostViewer;

inputPostContent#ef4fcbc4 flags:# text:flags.0?string entities:flags.1?Vector<MessageEntity> media:flags.2?Vector<InputMedia> place:flags.3?InputPostPlace rating:flags.4?int attachments:flags.5?Vector<InputPostAttachment> topic:flags.6?InputPostTopic = InputPostContent;

profilePostsAll#d461a97c = ProfilePosts;
profilePostsReplies#fbf74253 = ProfilePosts;
profilePostsShares#4626ec5a = ProfilePosts;
profilePostsMedia#ed8e743f filter:MessagesFilter = ProfilePosts;

posts.feedNotModified#d8f12c31 state:string = posts.Posts;
posts.posts#25b004c5 flags:# count:flags.0?int posts:Vector<Post> refs:Vector<Post> next_offset:flags.1?string state:flags.2?string read_max_id:flags.3?long topics:Vector<PostTopic> chats:Vector<Chat> users:Vector<User> user_extras:Vector<UserExtra> = posts.Posts;
posts.postViewers#bb30082c flags:# count:int viewers:Vector<PostViewer> next_offset:flags.0?string users:Vector<User> user_extras:Vector<UserExtra> = posts.PostViewers;
exportedPostLink#878c1f7b link:string = ExportedPostLink;

// Summaries of a person's, a topic's or a hashtag's recent posts (follow-up 5)
summarySourceUser#0ab64920 user_id:InputUser = SummarySource;
summarySourceTopic#b87b666b topic_id:long = SummarySource;
summarySourceHashtag#3fd6b48c flags:# cashtag:flags.0?true tag:string = SummarySource;

// ===== Topics, hashtags and feed tabs (v4-topics-hashtags-backend.md) =====

postTopic#176decbd flags:# closed:flags.0?true added:flags.1?true id:long title:string date:int posts_count:int posts_week_count:int added_count:int last_post_date:flags.2?int = PostTopic;
inputPostTopic#31f97177 id:long = InputPostTopic;
inputPostTopicNew#3d0abc03 title:string = InputPostTopic;
topics.topics#34b8d11f flags:# topics:Vector<PostTopic> next_offset:flags.0?string = topics.Topics;

postHashtag#4f50cfb4 flags:# added:flags.0?true cashtag:flags.1?true tag:string posts_count:int posts_week_count:int added_count:int = PostHashtag;

// The feed's tab bar works like upstream's chat folders: For You is the default (id 0 in the order),
// like dialogFilterDefault; every other tab has an id, like a folder.
feedTabForYou#7aa61045 = FeedTab;
feedTabFollowing#ceb8670 id:int = FeedTab;
feedTabTopic#b51bf916 id:int topic_id:long = FeedTab;
feedTabHashtag#f8d5f645 flags:# cashtag:flags.0?true id:int tag:string = FeedTab;
posts.feedTabs#1f051359 tabs:Vector<FeedTab> hashtags:Vector<PostHashtag> topics:Vector<PostTopic> = posts.FeedTabs;

// ===== People (v4-people-backend.md) =====

userExtra#5c9a4adf flags:# private:flags.0?true banned:flags.4?true user_id:long relationship:FollowRelationship status:flags.1?ProfileStatus posts_count:flags.2?int streak_count:flags.3?int = UserExtra;
followRelationship#7485efcf flags:# following:flags.0?true followed_by:flags.1?true requested:flags.2?true request_received:flags.3?true blocked:flags.4?true muted_until:flags.5?int = FollowRelationship;
followRow#dbe32898 flags:# user_id:long date:int until:flags.0?int = FollowRow;
follows.users#5f4fab9b flags:# count:flags.0?int rows:Vector<FollowRow> next_offset:flags.1?string users:Vector<User> user_extras:Vector<UserExtra> = follows.Users;

profileStatus#8a162eb7 flags:# id:long text:string date:int expire_date:int reactions_count:flags.0?int my_reaction:flags.1?Reaction = ProfileStatus;
statusReaction#fb170f88 user_id:long date:int reaction:Reaction = StatusReaction;
statuses.reactions#9956d0a1 flags:# count:int reactions:Vector<StatusReaction> next_offset:flags.0?string users:Vector<User> user_extras:Vector<UserExtra> = statuses.Reactions;

streak#9ac8eb47 flags:# count:int breaks_at:flags.0?int restore:flags.1?StreakRestore = Streak;
streakRestore#92c7c04b flags:# included_in_premium:flags.0?true count:int started_at:int broke_at:int count_after:int product_id:flags.1?string = StreakRestore;

profileBan#f6a18245 flags:# type:string until:flags.0?int = ProfileBan;
profiles.profile#6b829cba flags:# full_user:UserFull extra:UserExtra posts_count:int followers_count:int following_count:int streak:flags.0?Streak ban:flags.1?ProfileBan email:flags.2?string account:flags.3?AccountState blocked_by:flags.4?true chats:Vector<Chat> users:Vector<User> = profiles.Profile;

audienceList#ad073693 id:int title:string members_count:int = AudienceList;

// joins PrivacyRule and InputPrivacyRule: post and story audiences
privacyValueAllowFollowers#5c3de44f = PrivacyRule;
privacyValueAllowAudienceLists#25aa4082 lists:Vector<int> = PrivacyRule;
inputPrivacyValueAllowFollowers#e4f55425 = InputPrivacyRule;
inputPrivacyValueAllowAudienceLists#5522c82e lists:Vector<int> = InputPrivacyRule;

// joins InputStorePaymentPurpose: buying a streak restore
inputStorePaymentStreakRestore#19a9eb52 = InputStorePaymentPurpose;

// ===== Activity (v4-activity-backend.md) =====

activityRow#32bd38a1 flags:# unread:flags.0?true id:long date:int kind:ActivityKind actor_ids:Vector<long> actors_count:int target:flags.1?ActivityTarget text:flags.2?TextWithEntities expire_date:flags.3?int events_count:flags.4?int reactions:flags.5?Vector<ReactionCount> = ActivityRow;

activityKindPostReply#13b6757b = ActivityKind;
activityKindMention#b1757c61 = ActivityKind;
activityKindPostShared#a46361df = ActivityKind;
activityKindPostReaction#e8254b25 = ActivityKind;
activityKindFollow#4afbfb9a = ActivityKind;
activityKindFollowRequest#adf63047 = ActivityKind;
activityKindFollowRequestAccepted#b0a7cfc3 = ActivityKind;
activityKindFollowerPost#c4919104 = ActivityKind;
activityKindStoryReply#8e26ebe6 = ActivityKind;
activityKindStoryMention#88cc91fe = ActivityKind;
activityKindStoryReaction#22354cb = ActivityKind;
activityKindStoryShared#2a401eb8 = ActivityKind;
activityKindStoryPosted#d990bbb6 = ActivityKind;
activityKindStoryReposted#5482859f = ActivityKind;
activityKindPostSharedToStory#f890bda7 = ActivityKind;
activityKindPoke#c92eb5a4 = ActivityKind;
activityKindStatusUpdated#3df2398 = ActivityKind;
activityKindStatusReaction#4b76392d = ActivityKind;
activityKindScheduledPostPublished#1c719e07 = ActivityKind;
activityKindScheduledPostFailed#6f556d5c = ActivityKind;
activityKindStreakExpiring#8dc916e3 = ActivityKind;
activityKindSystem#a14e5c98 = ActivityKind;

activityTargetPost#fb0e347c post_id:long = ActivityTarget;
activityTargetReply#505bb644 post_id:long reply_id:long = ActivityTarget;
activityTargetStory#20a48d82 peer:Peer story_id:int = ActivityTarget;
activityTargetStatus#9f706a15 status_id:long = ActivityTarget;
activityTargetScheduledPost#b63cd81e id:long = ActivityTarget;

activityFilterAll#98f3315c = ActivityFilter;
activityFilterMentions#2e5f445 = ActivityFilter;
activityFilterFollows#12c850d5 = ActivityFilter;

activity.rows#545f4ab3 flags:# rows:Vector<ActivityRow> next_offset:flags.0?string posts:Vector<Post> stories:Vector<FoundStory> chats:Vector<Chat> users:Vector<User> user_extras:Vector<UserExtra> = activity.Rows;
activityInteractor#4385b25d user_id:long total_count:int unread_count:int replies_count:int reactions_count:int mentions_count:int follows_count:int pokes_count:int last_kind:ActivityKind last_date:int = ActivityInteractor;
activity.summary#3f606922 unread_all:int unread_mentions:int unread_follows:int follow_requests_count:int follow_request_ids:Vector<long> top_interactors:Vector<ActivityInteractor> users:Vector<User> = activity.Summary;
activitySettings#a9e86206 flags:# push:flags.0?true new_post:flags.1?true replies:flags.2?true reactions:flags.3?true follows:flags.4?true mentions:flags.5?true trending_places:flags.6?true news_updates:flags.7?true status_updates:flags.8?true stories:flags.9?true story_reactions:flags.10?true story_replies:flags.11?true status_reactions:flags.12?true shares:flags.13?true pokes:flags.14?true follow_requests:flags.15?true = ActivitySettings;

// ===== Stories (v4-stories-backend.md) =====

// joins MediaArea: a post card on a story
mediaAreaPost#fae21a55 coordinates:MediaAreaCoordinates post_id:long = MediaArea;
// joins StoryView: a post that shares the story, in the author's viewers list
storyViewPublicPost#e98afbca flags:# blocked:flags.0?true blocked_my_stories_from:flags.1?true post:Post = StoryView;

storyExtra#2eeab587 flags:# can_reply:flags.0?true id:int reply_privacy:PostReplyPrivacy replies_count:int = StoryExtra;
inputStoryExtra#862c1cc8 reply_privacy:PostReplyPrivacy = InputStoryExtra;
storyCapture#f24cee98 flags:# user_id:long screenshot_date:flags.0?int screen_recording_date:flags.1?int = StoryCapture;

// ===== Sign-in and account (v4-sign-in-account-backend.md) =====

emailauth.legacyPassword#eb119f95 flags:# hint:flags.0?string pending_reset_date:flags.1?int = emailauth.LegacyPassword;

confirmPurposeEmailChange#6ebd74f8 = ConfirmPurpose;
confirmPurposeDeletion#d4cfa669 = ConfirmPurpose;
profiles.confirmToken#70dd92c token:bytes valid_until:int = profiles.ConfirmToken;

accountState#75ad52ac flags:# last_active_date:int deactivated_date:flags.0?int deletion_requested_date:flags.1?int deletion_date:flags.1?int role:flags.2?string = AccountState;
profiles.deletion#8e2e0002 date:int = profiles.Deletion;

// ===== Updates (v4-server-backend.md, section 5) =====

// join Update
updatePostID#e8721bcb id:long random_id:long = Update;
updateNewPost#d92ee639 post:Post pts:int pts_count:int = Update;
updateEditPost#4a32827c post:Post pts:int pts_count:int = Update;
updateDeletePosts#7e95a349 id:Vector<long> pts:int pts_count:int = Update;
updateReadFeed#a3af8153 tab:FeedTab max_id:long = Update;
updatePostReplyDraft#c43833f1 to:PostRef draft:DraftMessage = Update;
updatePostReactions#dfa9e5ae id:long reactions:MessageReactions = Update;
updateUserExtra#b5de9794 extra:UserExtra = Update;
updateActivity#21d0f33d row:ActivityRow = Update;
updateActivityRead#9d1f9c21 flags:# filter:flags.0?ActivityFilter max_id:flags.1?long id:flags.2?Vector<long> = Update;
updateFeedTab#8273b009 flags:# id:int tab:flags.0?FeedTab = Update;
updateFeedTabsOrder#d916037 order:Vector<int> = Update;
updateFeedPost#e37f0f54 tab_ids:Vector<int> post:Post = Update;
updateFeedForYouBatch#7d5d1962 = Update;
updateFeedTabs#e2bfdca3 = Update;
updateAudienceLists#791d56f5 = Update;

---functions---

// ===== Posts =====

posts.sendPost#fac5a9e7 flags:# silent:flags.0?true noforwards:flags.1?true reply_to:flags.2?InputPostRef content:InputPostContent privacy_rules:Vector<InputPrivacyRule> reply_privacy:PostReplyPrivacy ttl_period:flags.3?int schedule_date:flags.4?int draft_id:flags.5?long random_id:long = Updates;
posts.editPost#df72c5b1 flags:# id:long content:flags.0?InputPostContent privacy_rules:flags.1?Vector<InputPrivacyRule> reply_privacy:flags.2?PostReplyPrivacy noforwards:flags.3?Bool schedule_date:flags.4?int silent:flags.5?Bool = Updates;
posts.deletePosts#3c2cf59e id:Vector<long> = Updates;

posts.getPosts#e7203f3b id:Vector<long> = posts.Posts;
posts.getFeed#b2db9bb2 flags:# tab:FeedTab state:flags.0?string offset:string limit:int = posts.Posts;
posts.readFeed#4448a3d5 tab:FeedTab max_id:long = Bool;
posts.getUserPosts#5908026d user_id:InputUser kind:ProfilePosts offset:string limit:int = posts.Posts;
posts.getReplies#56820223 to:InputPostRef offset:string limit:int = posts.Posts;
posts.getShares#9f9b4b75 id:long offset:string limit:int = posts.Posts;
posts.getBookmarks#d6862b21 offset:string limit:int = posts.Posts;
posts.getReacted#dc5a6aa6 offset:string limit:int = posts.Posts;
posts.getArchive#65e202ee offset:string limit:int = posts.Posts;
posts.searchPosts#3bc6c8ca flags:# top:flags.0?true cashtag:flags.4?true q:flags.1?string hashtag:flags.2?string topic_id:flags.3?long offset:string limit:int = posts.Posts;

posts.togglePinned#e09d6868 id:long pinned:Bool = Updates;
posts.toggleArchived#97b0c9de id:Vector<long> archived:Bool = Updates;
posts.toggleBookmarked#4b792384 id:long bookmarked:Bool = Updates;
posts.sendReaction#395c794b flags:# add_to_recent:flags.0?true id:long reaction:flags.1?Vector<Reaction> = Updates;
posts.getReactionsList#b3e5ccef flags:# id:long reaction:flags.0?Reaction offset:flags.1?string limit:int = messages.MessageReactionsList;
posts.readReactions#f1a78251 id:Vector<long> = Bool;
posts.sendVote#eb118413 id:long options:Vector<bytes> = Updates;
posts.getViewers#f8cf71d6 id:long offset:string limit:int = posts.PostViewers;
posts.exportPostLink#66fc07c id:long = ExportedPostLink;
posts.report#5851ab48 id:Vector<long> option:bytes message:string = ReportResult;
posts.summarize#244f6dbb flags:# id:long to_lang:flags.0?string = TextWithEntities;
posts.summarizePosts#66e082d2 flags:# source:SummarySource to_lang:flags.0?string = TextWithEntities;

posts.saveDraft#350adaaa flags:# noforwards:flags.2?true id:flags.0?long reply_to:flags.1?InputPostRef content:InputPostContent privacy_rules:flags.3?Vector<InputPrivacyRule> reply_privacy:flags.4?PostReplyPrivacy ttl_period:flags.5?int = Post;
posts.getDrafts#6b3a76c6 offset:string limit:int = posts.Posts;
posts.deleteDrafts#b2e0e313 id:Vector<long> = Bool;
posts.saveReplyDraft#cdb41557 flags:# no_webpage:flags.1?true to:InputPostRef message:string entities:flags.0?Vector<MessageEntity> = Bool;
posts.getAllReplyDrafts#d7517ef6 = Updates;
posts.clearAllReplyDrafts#afd6eb04 = Bool;
posts.getScheduledPosts#fb34e370 = posts.Posts;
posts.sendScheduledPosts#d047586e id:Vector<long> = Updates;
posts.deleteScheduledPosts#1758c499 id:Vector<long> = Updates;
posts.getDefaultTTL#fe02be79 = DefaultHistoryTTL;
posts.setDefaultTTL#1094d4b7 period:int = Bool;

// ===== Topics, hashtags and feed tabs =====

topics.getTopic#d22bd94f id:long = PostTopic;
topics.getTrending#df59ad0b offset:string limit:int = topics.Topics;
topics.search#908440f9 q:string offset:string limit:int = topics.Topics;
topics.report#70abc9d3 id:long option:bytes message:string = ReportResult;

hashtags.getHashtag#97ddc7a3 flags:# cashtag:flags.0?true tag:string = PostHashtag;
hashtags.suggest#8accde5c q:string limit:int = Vector<PostHashtag>;

posts.getFeedTabs#f41e20db = posts.FeedTabs;
posts.updateFeedTab#c1e15008 flags:# id:int tab:flags.0?FeedTab = Bool;
posts.updateFeedTabsOrder#eea81132 order:Vector<int> = Bool;

// ===== People =====

follows.follow#577d79b4 user_id:InputUser = Updates;
follows.unfollow#abceb335 user_id:InputUser = Updates;
follows.getFollowers#48313821 user_id:InputUser offset:string limit:int = follows.Users;
follows.getFollowing#66fb38e user_id:InputUser offset:string limit:int = follows.Users;
follows.getRequests#b8887d1b flags:# sent:flags.0?true offset:string limit:int = follows.Users;
follows.acceptRequest#408eee35 user_id:InputUser = Updates;
follows.rejectRequest#c3403f60 user_id:InputUser = Updates;
follows.withdrawRequest#f9bf4b4f user_id:InputUser = Updates;
follows.mute#ca22565f user_id:InputUser until:int = Updates;
follows.getMuted#1a69948f offset:string limit:int = follows.Users;
follows.getSuggestions#c9662e9b limit:int = follows.Users;

profiles.getProfile#d85db534 user_id:InputUser = profiles.Profile;
profiles.getUserExtras#4ae12a07 id:Vector<InputUser> = Vector<UserExtra>;
profiles.restoreStreak#65bc585b = Streak;

statuses.setStatus#142caaff text:string period:int = ProfileStatus;
statuses.deleteStatus#269ee889 = Bool;
statuses.sendReaction#2be3704d flags:# user_id:InputUser status_id:long reaction:flags.0?Reaction = Bool;
statuses.getReactions#d61f291d offset:string limit:int = statuses.Reactions;

pokes.send#90668988 flags:# user_id:InputUser message:flags.0?string = Bool;

lists.getLists#dd249a1a = Vector<AudienceList>;
lists.createList#29347fa2 title:string users:Vector<InputUser> = AudienceList;
lists.editList#c7bcf2f6 id:int title:string = AudienceList;
lists.deleteList#f2a86b95 id:int = Bool;
lists.reorderLists#69c44484 order:Vector<int> = Bool;
lists.getMembers#104a6a55 id:int offset:string limit:int = follows.Users;
lists.editMembers#f5c381a2 id:int add:Vector<InputUser> remove:Vector<InputUser> = AudienceList;

// ===== Activity =====

activity.getRows#c0468214 filter:ActivityFilter offset:string limit:int = activity.Rows;
activity.getSummary#19163e15 = activity.Summary;
activity.readRows#aff020dd flags:# filter:flags.0?ActivityFilter max_id:flags.1?long id:flags.2?Vector<long> = Bool;
activity.deleteRow#4c199796 id:long = Bool;
activity.getRowPeople#594e2128 id:long offset:string limit:int = follows.Users;
activity.getSettings#7303ccf1 = ActivitySettings;
activity.updateSettings#a4540337 settings:ActivitySettings = Bool;

// ===== Stories =====

invokeWithStoryExtra#6cb9ef18 {X:Type} extra:InputStoryExtra query:!X = X;
storyextras.getExtras#95002295 peer:InputPeer id:Vector<int> = Vector<StoryExtra>;
storyextras.reportCapture#69bfe763 flags:# screen_recording:flags.0?true peer:InputPeer id:int = Bool;
storyextras.getCaptures#58b0f3ed peer:InputPeer id:int users:Vector<InputUser> = Vector<StoryCapture>;
storyextras.toggleNoForwards#59d84579 peer:InputPeer id:int enabled:Bool = Updates;

// ===== Sign-in and account =====

emailauth.sendCode#31186c29 email:string api_id:int api_hash:string settings:CodeSettings = auth.SentCode;
emailauth.signIn#50a99e97 email:string code_hash:string code:string = auth.Authorization;
emailauth.signUp#1aa2036f email:string code_hash:string name:string username:string = auth.Authorization;
emailauth.checkUsername#389688a7 username:string = Bool;
emailauth.getLegacyPassword#5ec29d7c = emailauth.LegacyPassword;
emailauth.checkLegacyPassword#f25f7db6 password:string = auth.Authorization;
emailauth.resetPassword#92c0a9a6 = account.ResetPasswordResult;

profiles.sendConfirmCode#2ae21aab purpose:ConfirmPurpose = account.SentEmailCode;
profiles.confirm#7c28d9a7 flags:# purpose:ConfirmPurpose code:string password:flags.0?InputCheckPasswordSRP = profiles.ConfirmToken;
profiles.sendNewEmailCode#45cf6f4 confirm_token:bytes email:string = account.SentEmailCode;
profiles.changeEmail#34875ad0 confirm_token:bytes email:string code:string = Bool;
profiles.setPrivate#e45363db enabled:Bool = Bool;
profiles.deactivate#877f6e9f = Bool;
profiles.reactivate#371a40ea = Bool;
profiles.scheduleDeletion#3dcff2fc confirm_token:bytes = profiles.Deletion;
profiles.cancelDeletion#2d7c49ba = Bool;
profiles.renameSession#215045a9 hash:long name:string = Bool;

// ===== Admin =====

admin.getAdmins#7e4ff801 = Vector<User>;
admin.deletePost#c08d6b17 id:long = Bool;
admin.banUser#e237eeac user_id:InputUser type:string until:int = profiles.Profile;
admin.unbanUser#2a0f7a04 user_id:InputUser = profiles.Profile;
admin.setRole#d3fe358b user_id:InputUser role:string = profiles.Profile;
