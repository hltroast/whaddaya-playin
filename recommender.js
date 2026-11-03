function findGame(db, searchText) {
    return db.prepare(`
        SELECT game_id, name FROM Games
        WHERE name LIKE ? AND hidden = 0
        ORDER BY total_reviews DESC
        LIMIT 1`).get(`%${searchText}%`);
}

function recommend(db, gameId, count){
    return db.prepare(`
        SELECT g.game_id, g.name, SUM(MIN(input.score, cand.score)) AS match_score
        FROM GameTags input
        JOIN GameTags cand ON cand.tag_id = input.tag_id
        JOIN Games g on g.game_id = cand.game_id
        WHERE input.game_id = ?
        AND cand.game_id != ?
        and g.hidden = 0
        GROUP BY g.game_id
        ORDER BY match_score DESC, g.review_score DESC
        LIMIT ?`).all(gameId, gameId, count);
}

module.exports = { findGame, recommend };