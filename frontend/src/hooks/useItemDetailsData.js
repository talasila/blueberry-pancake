import { useState, useEffect } from 'react';
import itemService from '@/services/itemService';
import { ratingService } from '@/services/ratingService';
import apiClient from '@/services/apiClient';

/**
 * useItemDetailsData – encapsulates all data-fetching logic for ItemDetailsDrawer.
 *
 * Manages: item details, ratings (item + global), dashboard data (for ranking),
 * and user email resolution.
 *
 * @param {{ isOpen: boolean, eventId: string, itemId: number, eventState: string, isAdmin: boolean }} opts
 * @returns {{ item, isLoading, error, ratings, allRatings, isLoadingRatings, userEmail, cachedDashboardData, isLoadingRanking }}
 */
export function useItemDetailsData({ isOpen, eventId, itemId, eventState, isAdmin }) {
  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [isLoadingRatings, setIsLoadingRatings] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [cachedDashboardData, setCachedDashboardData] = useState(null);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);
  const [allRatings, setAllRatings] = useState([]);

  // Get user email on mount and when drawer opens
  useEffect(() => {
    if (isOpen && eventId) {
      let email = apiClient.getUserEmail();

      // Fall back to sessionStorage (stored during email entry)
      if (!email && eventId) {
        const storedEmail = sessionStorage.getItem(`event:${eventId}:email`);
        if (storedEmail) {
          email = storedEmail;
        }
      }

      setUserEmail(email);
    }
  }, [isOpen, eventId]);

  // Fetch dashboard data for ranking (cached per session)
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!eventId || !isOpen || cachedDashboardData) return;

      setIsLoadingRanking(true);
      try {
        const data = await apiClient.get(`/events/${eventId}/dashboard`);
        setCachedDashboardData(data);
      } catch (err) {
        console.error('Error fetching dashboard data for ranking:', err);
      } finally {
        setIsLoadingRanking(false);
      }
    };

    if (isOpen && eventId && (eventState === 'completed' || isAdmin)) {
      fetchDashboardData();
    }
  }, [isOpen, eventId, eventState, isAdmin, cachedDashboardData]);

  // Fetch item details and ratings when drawer opens
  useEffect(() => {
    if (isOpen && eventId && itemId && (eventState === 'completed' || isAdmin)) {
      fetchItemDetails();
      fetchRatings();
    } else {
      setItem(null);
      setError(null);
      setRatings([]);
    }
  }, [isOpen, eventId, itemId, eventState, isAdmin]);

  const fetchItemDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const itemData = await itemService.getItemByItemId(eventId, itemId);
      setItem(itemData?.assigned === false ? null : itemData);
    } catch (err) {
      console.error('Error fetching item details:', err);
      setError(err.message || 'Failed to load item details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRatings = async () => {
    if (!eventId || !itemId) return;

    setIsLoadingRatings(true);
    try {
      const allRatingsData = await ratingService.getRatings(eventId);
      setAllRatings(allRatingsData);
      const itemRatings = allRatingsData.filter(r => r.itemId === itemId);
      setRatings(itemRatings);
    } catch (err) {
      console.error('Error fetching ratings:', err);
      setRatings([]);
      setAllRatings([]);
    } finally {
      setIsLoadingRatings(false);
    }
  };

  return {
    item,
    isLoading,
    error,
    ratings,
    allRatings,
    isLoadingRatings,
    userEmail,
    cachedDashboardData,
    isLoadingRanking,
  };
}
