/************************************************************
 * MongoDB Aggregations & KPI
 * Project: Suivi académique des étudiants
 *
 * How to run:
 *   mongosh queries/aggregations.js
 ************************************************************/

/* =========================
   1) USE DATABASE
   ========================= */
db = db.getSiblingDB("suivi_academique");

/* =========================
   2) MOYENNE PAR ÉTUDIANT
   ========================= */
print("\n1) Moyenne par étudiant");
printjson(
  db.grades.aggregate([
    {
      $group: {
        _id: "$studentId",
        moyenne: { $avg: "$note" },
        noteMin: { $min: "$note" },
        noteMax: { $max: "$note" },
        nbNotes: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: "students",
        localField: "_id",
        foreignField: "_id",
        as: "student"
      }
    },
    { $unwind: "$student" },
    {
      $project: {
        _id: 0,
        studentId: "$_id",
        cne: "$student.cne",
        nom: "$student.nom",
        prenom: "$student.prenom",
        filiere: "$student.filiere",
        niveau: "$student.niveau",
        groupe: "$student.groupe",
        moyenne: { $round: ["$moyenne", 2] },
        noteMin: 1,
        noteMax: 1,
        nbNotes: 1
      }
    },
    { $sort: { moyenne: -1 } }
  ]).toArray()
);

/* =========================
   3) MOYENNE PAR MATIÈRE
   ========================= */
print("\n2) Moyenne par matière");
printjson(
  db.grades.aggregate([
    {
      $group: {
        _id: "$subjectId",
        moyenne: { $avg: "$note" },
        noteMin: { $min: "$note" },
        noteMax: { $max: "$note" },
        nbNotes: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: "subjects",
        localField: "_id",
        foreignField: "_id",
        as: "subject"
      }
    },
    { $unwind: "$subject" },
    {
      $project: {
        _id: 0,
        subjectId: "$_id",
        code: "$subject.code",
        nom: "$subject.nom",
        semester: "$subject.semester",
        coefficient: "$subject.coefficient",
        moyenne: { $round: ["$moyenne", 2] },
        noteMin: 1,
        noteMax: 1,
        nbNotes: 1
      }
    },
    { $sort: { moyenne: -1 } }
  ]).toArray()
);

/* =========================
   4) CLASSEMENT DES ÉTUDIANTS
   ========================= */
print("\n3) Classement des étudiants (Top 10)");
printjson(
  db.grades.aggregate([
    {
      $group: {
        _id: "$studentId",
        moyenne: { $avg: "$note" }
      }
    },
    {
      $lookup: {
        from: "students",
        localField: "_id",
        foreignField: "_id",
        as: "student"
      }
    },
    { $unwind: "$student" },
    {
      $project: {
        _id: 0,
        studentId: "$_id",
        cne: "$student.cne",
        nom: "$student.nom",
        prenom: "$student.prenom",
        filiere: "$student.filiere",
        moyenne: { $round: ["$moyenne", 2] }
      }
    },
    { $sort: { moyenne: -1 } },
    { $limit: 10 }
  ]).toArray()
);

/* =========================
   5) TAUX DE RÉUSSITE GLOBAL
   ========================= */
print("\n4) Taux de réussite global (note >= 10)");
printjson(
  db.grades.aggregate([
    {
      $group: {
        _id: null,
        tauxReussite: {
          $avg: {
            $cond: [{ $gte: ["$note", 10] }, 1, 0]
          }
        },
        moyenneGlobale: { $avg: "$note" },
        nbNotes: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        tauxReussite: {
          $round: [{ $multiply: ["$tauxReussite", 100] }, 2]
        },
        moyenneGlobale: { $round: ["$moyenneGlobale", 2] },
        nbNotes: 1
      }
    }
  ]).toArray()
);

/* =========================
   6) TAUX DE RÉUSSITE PAR MATIÈRE
   ========================= */
print("\n5) Taux de réussite par matière (note >= 10)");
printjson(
  db.grades.aggregate([
    {
      $group: {
        _id: "$subjectId",
        tauxReussite: {
          $avg: {
            $cond: [{ $gte: ["$note", 10] }, 1, 0]
          }
        },
        moyenne: { $avg: "$note" },
        nbNotes: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: "subjects",
        localField: "_id",
        foreignField: "_id",
        as: "subject"
      }
    },
    { $unwind: "$subject" },
    {
      $project: {
        _id: 0,
        code: "$subject.code",
        nom: "$subject.nom",
        tauxReussite: {
          $round: [{ $multiply: ["$tauxReussite", 100] }, 2]
        },
        moyenne: { $round: ["$moyenne", 2] },
        nbNotes: 1
      }
    },
    { $sort: { tauxReussite: -1 } }
  ]).toArray()
);

/* =========================
   7) MOYENNE PAR FILIÈRE & NIVEAU
   ========================= */
print("\n6) Moyenne par filière et niveau");
printjson(
  db.grades.aggregate([
    {
      $lookup: {
        from: "students",
        localField: "studentId",
        foreignField: "_id",
        as: "student"
      }
    },
    { $unwind: "$student" },
    {
      $group: {
        _id: {
          filiere: "$student.filiere",
          niveau: "$student.niveau"
        },
        moyenne: { $avg: "$note" },
        nbNotes: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        filiere: "$_id.filiere",
        niveau: "$_id.niveau",
        moyenne: { $round: ["$moyenne", 2] },
        nbNotes: 1
      }
    },
    { $sort: { filiere: 1, niveau: 1 } }
  ]).toArray()
);

/* =========================
   8) DISTRIBUTION DES MENTIONS
   ========================= */
print("\n7) Distribution des mentions");
printjson(
  db.grades.aggregate([
    {
      $bucket: {
        groupBy: "$note",
        boundaries: [0, 10, 12, 14, 16, 20.1],
        default: "Autres",
        output: {
          nbNotes: { $sum: 1 }
        }
      }
    },
    {
      $project: {
        _id: 0,
        mention: {
          $switch: {
            branches: [
              { case: { $eq: ["$_id", 0] }, then: "Échec (<10)" },
              { case: { $eq: ["$_id", 10] }, then: "Passable (10-12)" },
              { case: { $eq: ["$_id", 12] }, then: "Assez bien (12-14)" },
              { case: { $eq: ["$_id", 14] }, then: "Bien (14-16)" },
              { case: { $eq: ["$_id", 16] }, then: "Très bien (16-20)" }
            ],
            default: "Autres"
          }
        },
        nbNotes: 1
      }
    }
  ]).toArray()
);

print("\nAggregations terminé.");
