
/**
* ExplorerBase deals with the basic functionality of traversing file/directory
* structures.
*/

import java.io.*;
import java.util.*;

public class ExplorerBase {

    /**
    * This methods constructs (recursively) the entire directory/FileEntity
    * structure following the starting directory
    *
    * @param dir the starting directory to populate
    */
    public static void populateRecurse(Directory dir) {
        ArrayList<FileEntity> fileObjs = new ArrayList<FileEntity>();
        File[] files = dir.getFile().listFiles();
        for(int i = 0; i < files.length; i++) {
            if(files[i].isDirectory()) {
                Directory d = new Directory(files[i]);
                populateRecurse(d);
                fileObjs.add(d);
            }
            else {
                fileObjs.add(new FileEntity(files[i]));
            }
        }
        dir.setContents(fileObjs);
    }

    public static void main(String[] args) {

        Scanner in = new Scanner(System.in);

        System.out.println("\nExplore!");
        System.out.print("Starting directory: ");
        String p = in.nextLine();
        System.out.println();

        Directory d = new Directory(p); //current directory
        populateRecurse(d);
        System.out.println(d);
        while(true) {
            System.out.println();
            System.out.print("Next directory: ");
            String next = in.nextLine();
            d = d.getChildDirectory(next);
            System.out.println(d);
        }
    }

}
