import React, { useState, useEffect } from "react";
import { invoke } from '@tauri-apps/api/tauri';
import "./App.css";
import { useNavigate } from "react-router-dom";

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredResults, setFilteredResults] = useState([]);
  const [userData, setUserData] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await invoke('search_users_handler');
        setUserData(data);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserData([]);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const filteredData = userData.filter((item) =>
      item.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredResults(filteredData);
  }, [searchQuery, userData]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleNavigation = (targetEmail) => {
    navigate(`/profile?prop=${targetEmail}`);
  };

  return (
    <div className="searchOverlay">
      <div className="container">
        <h1>Search</h1>
        <input
          type="text"
          maxLength={20}
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Type to search..."
          data-testid="search-input"
        />
        {searchQuery.length > 0 ? (
          filteredResults.length > 0 ? (
            <div className="searchResults">
              {filteredResults.map((result, index) => (
                <div
                  onClick={() => handleNavigation(result.email)}
                  className="eachSearchResult"
                  key={index}
                  data-testid="search-box-result"
                >
                  <img src={result.profile_image_link} alt={`Result ${index}`} />
                  <div className="eachSearchResultLeft">
                    <div className="eachSearchResultTop">
                      <p>
                        <strong>{result.username}</strong>
                      </p>
                    </div>
                    <div className="eachSearchResultBottom">
                      <p className="eachSearchedUserName" data-testid="search-results">{result.name}</p>
                      <p className="eachSearchedFollowers">
                        {result.followers_count} Followers
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>
              {searchQuery} is currently not available on this platform
            </p>
          )
        ) : (
          <p>No search results yet.</p>
        )}
      </div>
    </div>
  );
}