#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use sea_orm::ColumnTrait;
use sea_orm::PaginatorTrait;
use serde::{Deserialize, Serialize};
use tauri::State;

mod entities;
use entities::{comments, followers, posts, prelude::*, users};

struct AppState {
    db: sea_orm::DatabaseConnection,
}
use sea_orm::{
    ActiveModelTrait, Database, DatabaseConnection, DbErr, EntityTrait, QueryFilter, QuerySelect,
    RelationTrait, Set,
};

#[tokio::main]
async fn main() -> Result<(), DbErr> {
    let db_url = "postgres://postgres:postgres@localhost:5432/insta_clone";
    let db = Database::connect(db_url).await?;

    tauri::Builder::default()
        .manage(AppState { db })
        .invoke_handler(tauri::generate_handler![
            create_user,
            login_handler,
            current_user_handler,
            add_comment_handler,
            explore_posts_handler,
            getting_comments,
            home_posts_handler,
            like_handler,
            search_users_handler,
            updated_followers_n_following_func,
            upload_post_to_firestore
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
struct CreateUserRequest {
    username: String,
    email: String,
    name: String,
    password: String,
    bio: Option<String>,
    link: Option<String>,
    profile_image_link: Option<String>,
}

#[derive(Serialize)]
struct UserProfileData {
    username: String,
    name: String,
    followers_count: i64,
    following_count: i64,
    bio: Option<String>,
    link: Option<String>,
    profile_image_link: Option<String>,
    email: String,
}

#[derive(Serialize)]
struct NamedUserPosts {
    image_link: String,
    likes: i32,
    comments: Vec<CommentData>,
    caption: Option<String>,
}

#[derive(Serialize, Debug)]
struct CommentData {
    comment: String,
    username: String,
}

#[derive(Serialize)]
struct UserProfileResponse {
    user_data: UserProfileData,
    user_posts: Vec<NamedUserPosts>,
}

#[tauri::command]
async fn create_user(
    state: State<'_, AppState>,
    user_data: CreateUserRequest,
) -> Result<String, String> {
    let user = users::ActiveModel {
        username: Set(user_data.username),
        email: Set(user_data.email),
        name: Set(user_data.name),
        password: Set(user_data.password),
        bio: Set(user_data.bio),
        link: Set(user_data.link),
        profile_image_link: Set(user_data.profile_image_link),
        created_at: Set(Some(chrono::Utc::now().into())),
        ..Default::default()
    };

    let result = Users::insert(user).exec(&state.db).await;

    match result {
        Ok(res) => Ok(format!("User created with ID: {}", res.last_insert_id)),
        Err(e) => Err(format!("Error creating user: {}", e)),
    }
}

#[tauri::command]
async fn current_user_handler(
    state: State<'_, AppState>,
    user_email: String,
) -> Result<UserProfileResponse, String> {
    let db = &state.db;

    // Fetch user data
    let user = Users::find()
        .filter(users::Column::Email.eq(user_email.clone()))
        .one(db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "User not found".to_string())?;

    // Fetch followers and following counts
    let followers_count = Followers::find()
        .filter(followers::Column::FollowingId.eq(user.id))
        .count(db)
        .await
        .map_err(|e| e.to_string())?;

    let following_count = Followers::find()
        .filter(followers::Column::FollowerId.eq(user.id))
        .count(db)
        .await
        .map_err(|e| e.to_string())?;

    let user_data = UserProfileData {
        username: user.username,
        name: user.name,
        followers_count: followers_count.try_into().unwrap(),
        following_count: following_count.try_into().unwrap(),
        bio: user.bio,
        link: user.link,
        profile_image_link: user.profile_image_link,
        email: user.email,
    };

    // Fetch user posts
    let posts = Posts::find()
        .filter(posts::Column::UserId.eq(user.id))
        .all(db)
        .await
        .map_err(|e| e.to_string())?;

    let mut user_posts = Vec::new();
    for post in posts {
        let comments: Vec<(comments::Model, Vec<users::Model>)> = Comments::find()
            .filter(comments::Column::PostId.eq(post.id))
            .find_with_related(Users)
            .all(db)
            .await
            .map_err(|e| e.to_string())?;

        let comment_data: Vec<CommentData> = comments
            .into_iter()
            .filter_map(|(c, u)| {
                u.first().map(|user| CommentData {
                    comment: c.comment,
                    username: user.username.clone(),
                })
            })
            .collect();

        user_posts.push(NamedUserPosts {
            image_link: post.image_link,
            likes: post.likes.unwrap_or(0),
            comments: comment_data,
            caption: post.caption,
        });
    }

    Ok(UserProfileResponse {
        user_data,
        user_posts,
    })
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[tauri::command]
async fn login_handler(
    state: State<'_, AppState>,
    login_data: LoginRequest,
) -> Result<String, String> {
    let db = &state.db;

    // Fetch user by email
    let user = Users::find()
        .filter(users::Column::Email.eq(login_data.email.clone()))
        .one(db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Email or password combination not found".to_string())?;

    // Verify password
    // if verify(&login_data.password, &user.password).map_err(|e| e.to_string())? {
    if &login_data.password == &user.password {
        Ok(format!("User {} logged in successfully", user.username))
    } else {
        Err("Email or password combination not found".to_string())
    }
}

#[derive(Debug, Deserialize)]
struct AddCommentRequest {
    comment: String,
    current_user: String,
}

#[derive(Debug, Serialize)]
struct ExplorePost {
    username: String,
    email: String,
    image_link: String,
    likes: i32,
    comments: Vec<CommentData>,
    caption: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UpdateLikeRequest {
    likes: i32,
    operation: String,
}

#[derive(Debug, Serialize)]
struct SearchUserResult {
    username: String,
    followers_count: i64,
    name: String,
    profile_image_link: Option<String>,
    email: String,
}

#[derive(Debug, Deserialize)]
struct UpdateFollowRequest {
    target_followers: i64,
    operation: String,
}

// Existing handlers...

#[tauri::command]
async fn add_comment_handler(
    state: State<'_, AppState>,
    user_mail: String,
    image_url: String,
    post: AddCommentRequest,
) -> Result<String, String> {
    let db = &state.db;

    let user = Users::find()
        .filter(users::Column::Email.eq(user_mail))
        .one(db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "User not found".to_string())?;

    let post = Posts::find()
        .filter(posts::Column::ImageLink.eq(image_url))
        .one(db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Post not found".to_string())?;

    // let new_comment = comments::ActiveModel {
    //     post_id: Set(Some(post.id)),
    //     user_id: Set(Some(user.id)),
    //     comment: Set(post.comment),
    //     ..Default::default()
    // };
    let new_comment = comments::ActiveModel {
        post_id: Set(Some(post.id)),
        user_id: Set(Some(user.id)),
        // comment: Set(post.comment.clone()),
        ..Default::default()
    };

    let result = new_comment.insert(db).await.map_err(|e| e.to_string())?;

    Ok(format!("Comment added with ID: {}", result.id))
}

#[tauri::command]
async fn explore_posts_handler(state: State<'_, AppState>) -> Result<Vec<ExplorePost>, String> {
    let db = &state.db;

    let posts_with_users = Posts::find()
        .find_with_related(Users)
        .all(db)
        .await
        .map_err(|e| e.to_string())?;

    let mut explore_posts = Vec::new();

    for (post, users) in posts_with_users {
        if let Some(user) = users.first() {
            let comments = Comments::find()
                .filter(comments::Column::PostId.eq(post.id))
                .find_with_related(Users)
                .all(db)
                .await
                .map_err(|e| e.to_string())?;

            let comment_data: Vec<CommentData> = comments
                .into_iter()
                .filter_map(|(c, u)| {
                    u.first().map(|user| CommentData {
                        comment: c.comment,
                        username: user.username.clone(),
                    })
                })
                .collect();

            explore_posts.push(ExplorePost {
                username: user.username.clone(),
                email: user.email.clone(),
                image_link: post.image_link,
                likes: post.likes.unwrap_or(0),
                comments: comment_data,
                caption: post.caption,
            });
        }
    }

    Ok(explore_posts)
}

#[tauri::command]
async fn getting_comments(
    state: State<'_, AppState>,
    user_mail: String,
    image_url: String,
) -> Result<Vec<CommentData>, String> {
    let db = &state.db;

    let user = Users::find()
        .filter(users::Column::Email.eq(user_mail))
        .one(db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "User not found".to_string())?;

    let post = Posts::find()
        .filter(posts::Column::ImageLink.eq(image_url))
        .one(db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Post not found".to_string())?;

    let comments = Comments::find()
        .filter(comments::Column::PostId.eq(post.id))
        .find_with_related(Users)
        .all(db)
        .await
        .map_err(|e| e.to_string())?;

    let comment_data: Vec<CommentData> = comments
        .into_iter()
        .filter_map(|(c, u)| {
            u.first().map(|user| CommentData {
                comment: c.comment,
                username: user.username.clone(),
            })
        })
        .collect();

    Ok(comment_data)
}

#[tauri::command]
async fn home_posts_handler(
    state: State<'_, AppState>,
    following_list: Vec<String>,
) -> Result<Vec<ExplorePost>, String> {
    let db = &state.db;

    let mut home_posts = Vec::new();

    for email in following_list {
        let user = Users::find()
            .filter(users::Column::Email.eq(email.clone()))
            .one(db)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("User with email {} not found", email.clone()))?;

        let posts = Posts::find()
            .filter(posts::Column::UserId.eq(user.id))
            .all(db)
            .await
            .map_err(|e| e.to_string())?;

        for post in posts {
            let comments = Comments::find()
                .filter(comments::Column::PostId.eq(post.id))
                .find_with_related(Users)
                .all(db)
                .await
                .map_err(|e| e.to_string())?;

            let comment_data: Vec<CommentData> = comments
                .into_iter()
                .filter_map(|(c, u)| {
                    u.first().map(|user| CommentData {
                        comment: c.comment,
                        username: user.username.clone(),
                    })
                })
                .collect();

            home_posts.push(ExplorePost {
                username: user.username.clone(),
                email: user.email.clone(),
                image_link: post.image_link,
                likes: post.likes.unwrap_or(0),
                comments: comment_data,
                caption: post.caption,
            });
        }
    }

    Ok(home_posts)
}

#[tauri::command]
async fn like_handler(
    state: State<'_, AppState>,
    user_mail: String,
    image_url: String,
    like_data: UpdateLikeRequest,
) -> Result<String, String> {
    let db = &state.db;

    let user = Users::find()
        .filter(users::Column::Email.eq(user_mail))
        .one(db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "User not found".to_string())?;

    let mut post = Posts::find()
        .filter(posts::Column::ImageLink.eq(image_url))
        .one(db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Post not found".to_string())?;

    let new_likes = if like_data.operation == "like" {
        like_data.likes + 1
    } else {
        like_data.likes
    };

    let mut post: posts::ActiveModel = post.into();
    post.likes = Set(Some(new_likes));

    let updated_post = post.update(db).await.map_err(|e| e.to_string())?;

    Ok(format!(
        "Post updated with new like count: {}",
        updated_post.likes.unwrap_or(0)
    ))
}

#[tauri::command]
async fn search_users_handler(state: State<'_, AppState>) -> Result<Vec<SearchUserResult>, String> {
    let db = &state.db;

    let users = Users::find().all(db).await.map_err(|e| e.to_string())?;

    let mut search_results = Vec::new();

    for user in users {
        let followers_count = Followers::find()
            .filter(followers::Column::FollowingId.eq(user.id))
            .count(db)
            .await
            .map_err(|e| e.to_string())?;

        search_results.push(SearchUserResult {
            username: user.username,
            followers_count: followers_count.try_into().unwrap(),
            name: user.name,
            profile_image_link: user.profile_image_link,
            email: user.email,
        });
    }

    Ok(search_results)
}

#[tauri::command]
async fn updated_followers_n_following_func(
    state: State<'_, AppState>,
    target_mail: String,
    shooter_mail: String,
    follow_data: UpdateFollowRequest,
) -> Result<String, String> {
    let db = &state.db;

    let target_user = Users::find()
        .filter(users::Column::Email.eq(target_mail))
        .one(db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Target user not found".to_string())?;

    let shooter_user = Users::find()
        .filter(users::Column::Email.eq(shooter_mail))
        .one(db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Shooter user not found".to_string())?;

    if follow_data.operation == "follow" {
        let new_follow = followers::ActiveModel {
            follower_id: Set(Some(shooter_user.id)),
            following_id: Set(Some(target_user.id)),
            ..Default::default()
        };

        new_follow.insert(db).await.map_err(|e| e.to_string())?;
    } else if follow_data.operation == "unfollow" {
        Followers::delete_many()
            .filter(followers::Column::FollowerId.eq(shooter_user.id))
            .filter(followers::Column::FollowingId.eq(target_user.id))
            .exec(db)
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok("Follower relationship updated successfully".to_string())
}

#[tauri::command]
async fn upload_post_to_firestore(
    state: State<'_, AppState>,
    user_mail: String,
    download_url: String,
    caption: String,
) -> Result<String, String> {
    let db = &state.db;

    let user = Users::find()
        .filter(users::Column::Email.eq(user_mail))
        .one(db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "User not found".to_string())?;

    let new_post = posts::ActiveModel {
        user_id: Set(Some(user.id)),
        image_link: Set(download_url),
        caption: Set(Some(caption)),
        ..Default::default()
    };

    let result = new_post.insert(db).await.map_err(|e| e.to_string())?;

    Ok(format!("Post created with ID: {}", result.id))
}
