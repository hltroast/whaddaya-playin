/*/
function findGame(db, searchText) {
    return db.prepare(`
        SELECT game_id, name FROM Games
        WHERE name LIKE ? AND hidden = 0
        ORDER BY total_reviews DESC
        LIMIT 1`).get(`%${searchText}%`);
}
/*Deprecated function, kept for posterity*/

//Alter LIKE to show percenage, possibly show additional options, "FALLOUT" should show Fallout 3 AND Fallout New Vegas
//for auto-fill, do a drop-down. Show multiple options at once. Don't just show one 
//google has an auto-complete API
/*/
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
/* */

function searchGames(db, searchText) {
    return db.prepare(`
        SELECT game_id, name FROM Games
        WHERE name LIKE ? AND hidden = 0
        ORDER BY name COLLATE NOCASE
        limit 8`).all(`%${searchText}%`);
}

function recommend(db, gameIds, count) {
    const ids = JSON.stringify(gameIds);
    return db.prepare(`
        WITH profile AS (
            SELECT tag_id, SUM(score) * 1.0 / ? AS score
            FROM GameTags
            WHERE game_id IN (SELECT value FROM json_each(?))
            GROUP BY tag_id
        )
        SELECT g.game_id, g.name, SUM(t.idf * MIN(p.score, cand.score)) AS match_score
        FROM profile p
        JOIN GameTags cand ON cand.tag_id = p.tag_id
        JOIN Tags t ON t.tag_id = p.tag_id
        JOIN Games g ON g.game_id = cand.game_id
        WHERE cand.game_id NOT IN (SELECT value FROM json_each(?))
        AND g.hidden = 0
        GROUP BY g.game_id
        ORDER BY match_score DESC, g.review_score DESC
        LIMIT ?`).all(gameIds.length, ids, ids, count);
}
/* */

module.exports = { searchGames, recommend };