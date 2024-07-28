import React, { useState, useEffect, useRef } from "react";
import { FiMoreHorizontal, FiMessageSquare, FiBookmark } from "react-icons/fi";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { RiShareForwardLine } from "react-icons/ri";
import { BsEmojiLaughing } from "react-icons/bs";
import "./overlay.css";
import { useNavigate } from "react-router-dom";
import { useSelector } from 'react-redux';
import { invoke } from '@tauri-apps/api/tauri';

export function OverlayTest({ OverAcID, OverAcCaption, OverAcLikes, OverAcImages, onStateChange, OverAcEmail }) {
    const [liked, setLiked] = useState(false);
    const userEmail = useSelector((state) => state.user.userEmail);
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const [commentData, setCommentData] = useState([]);

    const handleNavigateToProfile = () => {
        navigate(`/profile?prop=${OverAcEmail}`);
    };

    const likeHandler = async () => {
        try {
            const newLiked = !liked;
            setLiked(newLiked);
            const operation = newLiked ? "like" : "dislike";
            await invoke('like_handler', { 
                userMail: userEmail, 
                imageUrl: OverAcImages, 
                likeData: { likes: OverAcLikes, operation } 
            });
        } catch (error) {
            console.error('Error handling like:', error);
        }
    };

    const handleCommentPost = async (e) => {
        e.preventDefault();
        const inputValue = inputRef.current.value;
        try {
            await invoke('add_comment_handler', {
                userMail: userEmail,
                imageUrl: OverAcImages,
                commentReq: { comment: inputValue, current_user: userEmail }
            });
            setCommentData(prevComments => [...prevComments, { comment: inputValue, username: userEmail }]);
            inputRef.current.value = '';
        } catch (error) {
            console.error('Error posting comment:', error);
        }
    };

    useEffect(() => {
        const fetchComments = async () => {
            try {
                const comments = await invoke('getting_comments', {
                    userMail: OverAcEmail,
                    imageUrl: OverAcImages
                });
                setCommentData(comments);
            } catch (error) {
                console.error('Error fetching comments:', error);
            }
        };
        fetchComments();
    }, [OverAcEmail, OverAcImages]);

    return (
        <div className="overlay">
            <div className="overlaybg" onClick={onStateChange}></div>
            <div className="overlayInner">
                <div className="overlayLeft">
                    <img src={OverAcImages} alt="post" />
                </div>
                <hr color="#262626" align="center" />
                <div className="overlayRight">
                    <div className="overlayRightTT">
                        <div className="overlayRightTop">
                            <div className="overlayRightTopLeft">
                                <img src="placeholder_profile_image_url" alt="profileimg" />
                                <div className="overlayRightTM">
                                    <p onClick={handleNavigateToProfile} className="overlayUsername">{OverAcID}</p>
                                    <p className="overlayRightTopText">Location</p>
                                </div>
                            </div>
                            <FiMoreHorizontal size={25} color="white" style={{ padding: '7px' }} />
                        </div>
                        <hr color="#262626" align="center" />
                        <div className="overlayRightMiddle">
                            <img src="placeholder_profile_image_url" alt="profileimg" />
                            <div className="overlayRightMiddleRight">
                                <p onClick={handleNavigateToProfile} className="overlayUsername">{OverAcID}</p>
                                <p className="overlayRightTopText">{OverAcCaption}</p>
                                <p className="overlayDuration">1 w</p>
                            </div>
                        </div>
                    </div>
                    <div className="overlayRightCommentSection">
                        {commentData.map((comment, index) => (
                            <div key={index} className="eachCommentBox">
                                <img src="placeholder_profile_image_url" alt="profile" />
                                <div className="eachCommentText">
                                    <p className="usernameEachComment"><strong>{comment.username}</strong></p>
                                    <p className="commentEachComment">{comment.comment}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="overlayRightBottom">
                        <hr color="#262626" align="center" />
                        <div className="overlayRightBottomTop">
                            <div className="ORBTL">
                                {liked ? (
                                    <AiFillHeart onClick={likeHandler} size={25} color="white" style={{ padding: '7px' }} />
                                ) : (
                                    <AiOutlineHeart onClick={likeHandler} size={25} color="white" style={{ padding: '7px' }} />
                                )}
                                <FiMessageSquare size={25} color="white" style={{ padding: '7px' }} />
                                <RiShareForwardLine size={25} color="white" style={{ padding: '7px' }} />
                            </div>
                            <div className="ORBTR">
                                <FiBookmark size={25} color="white" style={{ padding: '7px' }} />
                            </div>
                        </div>
                        <div className="overlayRightBottomMiddle">
                            <p className="overlayRightBottomMiddleText">{liked ? (parseInt(OverAcLikes) + 1) : OverAcLikes} likes</p>
                        </div>
                        <hr color="#262626" align="center" />
                        <form onSubmit={handleCommentPost} className="overlayRightBottomBottom">
                            <BsEmojiLaughing size={25} color="white" style={{ padding: '7px' }} />
                            <input ref={inputRef} type="text" placeholder="Add a Comment..." />
                            <button className="commentPostButton">Post</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}